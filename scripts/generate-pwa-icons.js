#!/usr/bin/env node

/**
 * Generate PWA PNG Icons from SVG Files
 *
 * This script converts SVG icons to PNG files at multiple sizes
 * Required for PWA to work properly on all devices
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ICON_SIZES = [
  { name: 'icon-192x192.png', width: 192, height: 192 },
  { name: 'icon-512x512.png', width: 512, height: 512 },
  { name: 'apple-touch-icon.png', width: 180, height: 180 },
];

const APPS = ['plasma-venmo', 'plasma-predictions', 'bill-split'];

function generatePngUsingSharp(svgPath, outputPath, width, height) {
  try {
    // Use sharp to convert SVG to PNG
    const sharp = require('sharp');
    sharp(svgPath)
      .resize(width, height)
      .png({ quality: 90 })
      .toFile(outputPath)
      .then(() => {
        console.log(`✅ Generated: ${path.basename(outputPath)} (${width}x${height})`);
      })
      .catch(err => {
        console.error(`❌ Error generating ${path.basename(outputPath)}:`, err.message);
      });
  } catch (err) {
    console.error(`❌ Sharp not available or error:`, err.message);
    console.log(`⚠️  Falling back to online tool: https://cloudconvert.com/svg-to-png`);
  }
}

function generateIconsForApp(appName) {
  console.log(`\n🎨 Generating icons for ${appName}...`);

  const appDir = path.join(__dirname, '..', 'plasma-sdk', 'apps', appName);
  const publicDir = path.join(appDir, 'public');
  const svgPath = path.join(publicDir, 'icon.svg');

  if (!fs.existsSync(svgPath)) {
    console.log(`⚠️  SVG not found: ${svgPath}`);
    return;
  }

  // Check if sharp is available locally or install it
  let sharpAvailable = false;
  try {
    const packageJson = JSON.parse(fs.readFileSync(path.join(appDir, 'package.json'), 'utf-8'));
    const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
    sharpAvailable = !!deps['sharp'];
  } catch (err) {
    // Ignore errors
  }

  if (sharpAvailable) {
    console.log('📦 Using sharp for conversion');
    ICON_SIZES.forEach(size => {
      const outputPath = path.join(publicDir, size.name);
      generatePngUsingSharp(svgPath, outputPath, size.width, size.height);
    });
  } else {
    console.log('⚠️  Sharp not found in app dependencies');
    console.log('📦 Installing sharp...');
    try {
      execSync(`cd ${appDir} && npm install sharp@latest --save-dev`, { stdio: 'inherit' });
      console.log('✅ Sharp installed, generating icons...');
      ICON_SIZES.forEach(size => {
        const outputPath = path.join(publicDir, size.name);
        generatePngUsingSharp(svgPath, outputPath, size.width, size.height);
      });
    } catch (err) {
      console.error('❌ Failed to install sharp:', err.message);
      console.log('\n📝 Manual steps:');
      console.log('   1. Visit: https://cloudconvert.com/svg-to-png');
      console.log('   2. Upload each icon.svg from the public directories');
      console.log('   3. Download at 192x192, 512x512, and 180x180 sizes');
      console.log('   4. Rename to: icon-192x192.png, icon-512x512.png, apple-touch-icon.png');
    }
  }
}

console.log('🚀 PWA Icon Generator');
console.log('='.repeat(50));

APPS.forEach(generateIconsForApp);

setTimeout(() => {
  console.log('\n✅ Icon generation complete!');
  console.log('\n📝 Note: Sharp has been installed in app dependencies');
  console.log('📝 Update package.json to include sharp as devDependency if needed');
}, 3000); // Wait for async sharp conversions
