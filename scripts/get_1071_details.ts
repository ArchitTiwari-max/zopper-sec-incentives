import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    try {
        const video = await prisma.pitchSultanVideo.findFirst({
            where: { serialNumber: 1071 }
        });
        console.log('Video 1071 Details:');
        console.log('  ID:', video?.id);
        console.log('  Title:', video?.title);
        console.log('  URL:', video?.url);
        console.log('  ThumbnailUrl:', video?.thumbnailUrl);
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
