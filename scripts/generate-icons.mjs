import sharp from 'sharp';
import { mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

async function generateIcons() {
  const iconsDir = join(projectRoot, 'src-tauri', 'icons');
  
  // Ensure icons directory exists
  await mkdir(iconsDir, { recursive: true });
  
  const svgPath = join(projectRoot, 'public', 'icon.svg');
  
  // Generate PNG icons of various sizes
  const sizes = [32, 128, 256];
  
  for (const size of sizes) {
    const filename = size === 256 ? '128x128@2x.png' : `${size}x${size}.png`;
    await sharp(svgPath)
      .resize(size, size)
      .png()
      .toFile(join(iconsDir, filename));
    console.log(`Generated ${filename}`);
  }
  
  // Also create icon.png (512x512 for general use)
  await sharp(svgPath)
    .resize(512, 512)
    .png()
    .toFile(join(iconsDir, 'icon.png'));
  console.log('Generated icon.png');
  
  console.log('Done generating icons!');
}

generateIcons().catch(console.error);

