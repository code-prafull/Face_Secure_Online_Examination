/**
 * Server-side face-descriptor verification (additive controller).
 * POST /api/face/verify  (authenticated)
 *
 * Body: { descriptorA: number[128], descriptorB: number[128], threshold? }
 *
 * The product's primary identity check runs on-device in the browser so raw
 * face data is never uploaded. This endpoint exists for cases where the
 * server must independently confirm two 128-d face descriptors (audit /
 * secondary verification) — it receives only numeric descriptors, never
 * images.
 */

const DEFAULT_THRESHOLD = 0.55; // same cut-off the client uses

const euclideanDistance = (a, b) => {
    let sum = 0;
    for (let i = 0; i < a.length; i += 1) {
        const d = a[i] - b[i];
        sum += d * d;
    }
    return Math.sqrt(sum);
};

const isValidDescriptor = (value) =>
    Array.isArray(value) &&
    value.length === 128 &&
    value.every((n) => typeof n === "number" && Number.isFinite(n));

const verifyFace = (req, res) => {
    try {
        const { descriptorA, descriptorB, threshold } = req.body || {};

        if (!isValidDescriptor(descriptorA) || !isValidDescriptor(descriptorB)) {
            return res.status(400).json({
                message:
                    "descriptorA and descriptorB must each be an array of 128 finite numbers"
            });
        }

        let cut = DEFAULT_THRESHOLD;
        if (threshold !== undefined && threshold !== null) {
            cut = Number(threshold);
            if (Number.isNaN(cut) || cut <= 0 || cut > 2) {
                return res.status(400).json({
                    message: "threshold must be a number in (0, 2]"
                });
            }
        }

        const distance = euclideanDistance(descriptorA, descriptorB);

        res.status(200).json({
            message: "Verification complete",
            match: distance <= cut,
            distance: Math.round(distance * 10000) / 10000,
            threshold: cut
        });
    } catch (error) {
        res.status(500).json({
            message: "Face verification failed",
            error: error.message
        });
    }
};

module.exports = { verifyFace };
