import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkVideos() {
    try {
        const videos = await prisma.pitchSultanVideo.findMany();
        console.log(`Found ${videos.length} videos`);
        videos.forEach(v => {
            console.log(`Video ID: ${v.id}, isActive: ${v.isActive}, Title: ${v.title}`);
        });
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkVideos();
