
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const serialNumbers = [1018, 1001, 1011, 1012, 1019, 1030, 1037, 1047, 1048, 1053, 1059];

async function main() {
    const videos = await prisma.pitchSultanVideo.findMany({
        where: {
            serialNumber: {
                in: serialNumbers
            }
        }
    });

    const results = videos.map(v => ({
        serialNumber: v.serialNumber,
        id: v.id
    }));

    console.log(JSON.stringify(results, null, 2));
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
