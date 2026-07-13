const User = require('../models/User');
const VerificationRequest = require('../models/VerificationRequest');
const Notification = require('../models/Notification');
const { cloudinary } = require('../config/cloudinary');
const {
  extractText,
  extractAadhaarNumberFromText,
  extractDateOfBirthFromText,
  extractNameFromText,
  calculateAgeFromDOB,
} = require('../utils/ocr');
const {
  isValidAadhaarNumber,
  encryptAadhaarNumber,
  hashAadhaarNumber,
  maskAadhaarNumber,
} = require('../utils/aadhaarCrypto');

const MIN_AGE = 18;

/** Uploads a raw image buffer to Cloudinary under the aadhaar folder. */
const uploadBufferToCloudinary = (buffer, publicIdPrefix) =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: 'parola-bolt/aadhaar', resource_type: 'image', public_id: `${publicIdPrefix}-${Date.now()}` },
      (err, result) => (err ? reject(err) : resolve(result))
    );
    stream.end(buffer);
  });

/**
 * POST /api/verification/aadhaar
 * Multipart: aadhaarFront, aadhaarBack (image files)
 *
 * Runs OCR on both sides, extracts the Aadhaar number + DOB, checks the
 * age gate, checks for duplicate Aadhaar registrations, and either:
 *   - auto-verifies (age >= 18, valid + unique Aadhaar number)
 *   - auto-rejects (age < 18) and blocks the account
 *   - leaves it pending for manual admin review (OCR couldn't read it confidently)
 */
const submitAadhaar = async (req, res, next) => {
  try {
    const front = req.files?.aadhaarFront?.[0];
    const back = req.files?.aadhaarBack?.[0];
    if (!front || !back) {
      return res.status(400).json({ success: false, message: 'Please upload both the front and back of your Aadhaar card.' });
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];
    if (!allowedTypes.includes(front.mimetype) || !allowedTypes.includes(back.mimetype)) {
      return res.status(400).json({ success: false, message: 'Only JPG or PNG images are allowed.' });
    }

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    if (user.aadhaarVerified) {
      return res.status(200).json({
        success: true,
        message: 'Aadhaar already verified.',
        status: 'verified',
        user: user.toSafeObject(),
      });
    }

    // Run OCR on both sides in parallel
    const [frontText, backText] = await Promise.all([extractText(front.buffer), extractText(back.buffer)]);
    const combinedText = `${frontText}\n${backText}`;

    const aadhaarDigits = extractAadhaarNumberFromText(combinedText);
    const dob = extractDateOfBirthFromText(combinedText);
    const extractedName = extractNameFromText(frontText);

    const ocrConfident = Boolean(aadhaarDigits && isValidAadhaarNumber(aadhaarDigits) && dob);

    // Upload images to Cloudinary regardless of OCR outcome — admin needs
    // to see them either for manual review or for after-the-fact auditing.
    const [frontUpload, backUpload] = await Promise.all([
      uploadBufferToCloudinary(front.buffer, `${user._id}-front`),
      uploadBufferToCloudinary(back.buffer, `${user._id}-back`),
    ]);

    const age = dob ? calculateAgeFromDOB(dob) : null;
    const maskedNumber = aadhaarDigits ? maskAadhaarNumber(aadhaarDigits) : '';

    const baseRequestData = {
      user: user._id,
      documentType: 'aadhaar',
      documentFront: { url: frontUpload.secure_url, publicId: frontUpload.public_id },
      documentBack: { url: backUpload.secure_url, publicId: backUpload.public_id },
      extracted: {
        nameOnDocument: extractedName,
        dateOfBirth: dob,
        age,
        aadhaarNumberMasked: maskedNumber,
        ocrConfident,
      },
    };

    // ---- Case 1: OCR couldn't confidently read the number/DOB — needs a human ----
    if (!ocrConfident) {
      await VerificationRequest.create({
        ...baseRequestData,
        status: 'pending',
        autoDecision: false,
      });
      user.verificationStatus = 'pending';
      await user.save();

      return res.status(202).json({
        success: true,
        status: 'pending',
        message: 'We could not clearly read your Aadhaar details. Your documents have been submitted for manual review.',
      });
    }

    // ---- Case 2: Underage — reject immediately, do not activate the account ----
    if (age < MIN_AGE) {
      await VerificationRequest.create({
        ...baseRequestData,
        status: 'rejected',
        rejectionReason: 'Applicant is under the minimum age of 18.',
        autoDecision: true,
        reviewedAt: new Date(),
      });
      user.verificationStatus = 'rejected';
      user.isAgeVerified = false;
      user.aadhaarVerified = false;
      await user.save();

      return res.status(403).json({
        success: false,
        status: 'rejected',
        message: 'You must be at least 18 years old to use Parola Bolt.',
      });
    }

    // ---- Case 3: Duplicate Aadhaar already registered to a different account ----
    const numberHash = hashAadhaarNumber(aadhaarDigits);
    const duplicate = await User.findOne({ aadhaarNumberHash: numberHash, _id: { $ne: user._id } });
    if (duplicate) {
      await VerificationRequest.create({
        ...baseRequestData,
        status: 'rejected',
        rejectionReason: 'This Aadhaar number is already registered with another account.',
        autoDecision: true,
        reviewedAt: new Date(),
      });
      user.verificationStatus = 'rejected';
      await user.save();

      return res.status(409).json({
        success: false,
        status: 'rejected',
        message: 'This Aadhaar number is already registered with another Parola Bolt account.',
      });
    }

    // ---- Case 4: Valid, unique, 18+ — auto-verify ----
    await VerificationRequest.create({
      ...baseRequestData,
      status: 'approved',
      autoDecision: true,
      reviewedAt: new Date(),
    });

    user.aadhaarVerified = true;
    user.aadhaarNumber = encryptAadhaarNumber(aadhaarDigits);
    user.aadhaarNumberMasked = maskedNumber;
    user.aadhaarNumberHash = numberHash;
    user.age = age;
    user.isAgeVerified = true;
    user.isIdentityVerified = true;
    user.verificationStatus = 'verified';
    user.verifiedAt = new Date();
    await user.save();

    await Notification.create({
      recipient: user._id,
      type: 'verification_update',
      text: 'Your identity has been verified via Aadhaar. You now have a verified badge!',
    });

    res.status(200).json({
      success: true,
      status: 'verified',
      message: 'Identity verified successfully.',
      user: user.toSafeObject(),
    });
  } catch (err) {
    next(err);
  }
};

/** GET /api/verification/aadhaar/status */
const getAadhaarStatus = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    const latestRequest = await VerificationRequest.findOne({ user: user._id, documentType: 'aadhaar' }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      aadhaarVerified: user.aadhaarVerified,
      verificationStatus: user.verificationStatus,
      rejectionReason: latestRequest?.rejectionReason || '',
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { submitAadhaar, getAadhaarStatus };
