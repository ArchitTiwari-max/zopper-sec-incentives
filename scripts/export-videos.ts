
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import * as XLSX from 'xlsx';

const prisma = new PrismaClient();

async function exportVideos() {
    console.log('🔍 Fetching all videos...');

    const videos = await prisma.pitchSultanVideo.findMany({
        orderBy: {
            serialNumber: 'asc',
        },
        select: {
            id: true,
            serialNumber: true,
            url: true,
            fileName: true,
            title: true
        }
    });

    console.log(`✅ Found ${videos.length} videos.`);

    // Prepare data for Excel
    const excelData = videos.map(video => ({
        'Serial Number': video.serialNumber || 'N/A',
        'Video ID': video.id,
        'URL': video.url,
        'File Name': video.fileName || '',
        'Title': video.title || ''
    }));

    // Create a new workbook and add the worksheet
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(excelData);

    // Adjust column widths (optional but nice)
    const wscols = [
        { wch: 15 }, // Serial Number
        { wch: 30 }, // Video ID
        { wch: 80 }, // URL
        { wch: 40 }, // File Name
        { wch: 50 }, // Title
    ];
    worksheet['!cols'] = wscols;

    XLSX.utils.book_append_sheet(workbook, worksheet, 'Videos');

    // Ensure exports directory exists
    const exportDir = path.join(process.cwd(), 'exports');
    if (!fs.existsSync(exportDir)) {
        fs.mkdirSync(exportDir);
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filePath = path.join(exportDir, `videos-export-${timestamp}.xlsx`);

    XLSX.writeFile(workbook, filePath);

    console.log(`📄 Exported to: ${filePath}`);
}

exportVideos()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
