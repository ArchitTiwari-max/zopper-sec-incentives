
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const earlyBirdSerials = [1001, 1002, 1003, 1004, 1005];

async function main() {
    const videos = await prisma.pitchSultanVideo.findMany({
        where: {
            serialNumber: {
                in: earlyBirdSerials
            }
        },
        include: {
            secUser: {
                include: {
                    store: true
                }
            }
        }
    });

    const results = videos.map(v => ({
        serialNumber: v.serialNumber,
        id: v.id,
        url: v.url,
        secName: v.secUser?.name || 'Unknown',
        storeName: v.secUser?.store?.storeName || 'Unknown Store'
    }));

    console.log(JSON.stringify(results, null, 2));
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
