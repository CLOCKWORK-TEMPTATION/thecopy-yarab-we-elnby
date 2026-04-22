/**
 * Image Optimization Script
 * Converts PNG/JPG images to WebP and AVIF formats for better performance
 * Usage: node scripts/optimize-images.js
 */

const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

const inputDir = path.join(__dirname, "../public/directors-studio");
const outputDir = path.join(__dirname, "../public/directors-studio/optimized");

// Create output directory if it doesn't exist
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
  console.log("✓ Created output directory:", outputDir);
}

// Get all image files
const imageFiles = fs
  .readdirSync(inputDir)
  .filter((file) => /\.(png|jpg|jpeg)$/i.test(file));

console.log(`\nFound ${imageFiles.length} images to optimize:\n`);

// Process each image
const processImages = async () => {
  for (const file of imageFiles) {
    const inputPath = path.join(inputDir, file);
    const filename = path.parse(file).name;

    console.log(`Processing: ${file}`);

    try {
      // Get original file size
      const originalStats = fs.statSync(inputPath);
      const originalSize = (originalStats.size / 1024).toFixed(2);

      // Generate WebP
      const webpPath = path.join(outputDir, `${filename}.webp`);
      await sharp(inputPath).webp({ quality: 85, effort: 6 }).toFile(webpPath);

      const webpStats = fs.statSync(webpPath);
      const webpSize = (webpStats.size / 1024).toFixed(2);
      const webpSavings = (
        (1 - webpStats.size / originalStats.size) *
        100
      ).toFixed(1);

      console.log(`  ✓ WebP: ${webpSize}KB (${webpSavings}% smaller)`);

      // Generate AVIF (best compression)
      const avifPath = path.join(outputDir, `${filename}.avif`);
      await sharp(inputPath).avif({ quality: 70, effort: 9 }).toFile(avifPath);

      const avifStats = fs.statSync(avifPath);
      const avifSize = (avifStats.size / 1024).toFixed(2);
      const avifSavings = (
        (1 - avifStats.size / originalStats.size) *
        100
      ).toFixed(1);

      console.log(`  ✓ AVIF: ${avifSize}KB (${avifSavings}% smaller)`);
      console.log(`  Original: ${originalSize}KB\n`);
    } catch (error) {
      console.error(`  ✗ Error processing ${file}:`, error.message);
    }
  }

  console.log("\n✓ Image optimization complete!\n");
  console.log("Next steps:");
  console.log("1. Update components to use optimized images");
  console.log("2. Consider using <picture> element for fallbacks");
  console.log(
    "3. Or use next/image which handles format selection automatically\n"
  );
};

processImages().catch(console.error);
