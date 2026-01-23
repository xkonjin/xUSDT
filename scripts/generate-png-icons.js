#!/usr/bin/env node

/**
 * Generate PWA PNG Icons from SVG Files
 * Uses sharp library for high-quality PNG conversion
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const ICON_SIZES = [
  { name: 'icon-192x192.png', width: 192, height: 192 },
  { name: 'icon-512x512.png', width: 512, height: 512 },
  { name: 'apple-touch-icon.png', width: 180, height: 180 },
];

const APPS = ['plasma-venmo', 'plasma-predictions', 'bill-split'];

async function generatePng(svgPath, outputPath, width, height) {
  try {
    await sharp(svgPath)
      .resize(width, height)
      .png({
        quality: 90,
        compressionLevel: 9,
        progressive: true
      })
      .toFile(outputPath);

    console.log(`  ✅ ${path.basename(outputPath)} (${width}x${height})`);
  } catch (err) {
    console.error(`  ❌ Error generating ${path.basename(outputPath)}:`, err.message);
  }
}

async function generateIconsForApp(appName) {
  console.log(`\n🎨 Generating icons for ${appName}...`);

  const appDir = path.join(__dirname, '..', 'plasma-sdk', 'apps', appName);
  const publicDir = path.join(appDir, 'public');
  const svgPath = path.join(publicDir, 'icon.svg');

  if (!fs.existsSync(svgPath)) {
    console.log(`  ⚠️  SVG not found: ${svgPath}`);
    return;
  }

  // Generate all sizes
  for (const size of ICON_SIZES) {
    const outputPath = path.join(publicDir, size.name);
    await generatePng(svgPath, outputPath, size.width, size.height);
  }

  console.log(`  ✅ All icons generated for ${appName}`);
}

async function main() {
  console.log('🚀 PWA PNG Icon Generator');
  console.log('='.repeat(50));
  console.log('Using sharp library for high-quality conversion\n');

  for (const app of APPS) {
    await generateIconsForApp(app);
  }

  console.log('\n' + '='.repeat(50));
  console.log('✅ All PWA icons generated successfully!');
  console.log('\n📝 Generated files:');
  console.log('   - icon-192x192.png (Favicon & Android)');
  console.log('   - icon-512x512.png (iOS & High DPI)');
  console.log('   - apple-touch-icon.png (iOS Home Screen)');
}

main().catch(err => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});
