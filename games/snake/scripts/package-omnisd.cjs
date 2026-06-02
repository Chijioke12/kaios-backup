const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

async function packageOmniSD() {
    const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    const appId = pkg.name;
    const distDir = 'dist';
    const buildDir = 'build_omnisd';

    console.log('--- Starting OmniSD Packaging ---');

    // 1. Ensure build directory exists and is clean
    if (fs.existsSync(buildDir)) {
        fs.rmSync(buildDir, { recursive: true, force: true });
    }
    fs.mkdirSync(buildDir);

    // 2. Create application.zip from dist folder
    console.log('Creating application.zip...');
    try {
        // Use cd and zip to ensure the files are at the root of the zip
        execSync(`cd ${distDir} && zip -r ../${buildDir}/application.zip .`);
    } catch (err) {
        console.error('Error creating application.zip:', err.message);
        process.exit(1);
    }

    // 3. Create metadata.json
    console.log('Creating metadata.json...');
    const metadata = {
        version: 1,
        manifestURL: `app://${appId}/manifest.webapp`
    };
    fs.writeFileSync(path.join(buildDir, 'metadata.json'), JSON.stringify(metadata, null, 2));

    // 4. Create update.webapp (required for OmniSD)
    console.log('Creating update.webapp...');
    fs.writeFileSync(path.join(buildDir, 'update.webapp'), '{}');

    // 5. Create the final outer zip
    const outputZip = `${appId}-omnisd.zip`;
    console.log(`Creating final package: ${outputZip}...`);
    try {
        if (fs.existsSync(outputZip)) {
            fs.unlinkSync(outputZip);
        }
        execSync(`cd ${buildDir} && zip -r ../${outputZip} application.zip metadata.json update.webapp`);
    } catch (err) {
        console.error('Error creating final package:', err.message);
        process.exit(1);
    }

    // 6. Cleanup
    console.log('Cleaning up temporary files...');
    fs.rmSync(buildDir, { recursive: true, force: true });

    console.log(`\nSUCCESS: OmniSD package created at ./${outputZip}`);
}

packageOmniSD();
