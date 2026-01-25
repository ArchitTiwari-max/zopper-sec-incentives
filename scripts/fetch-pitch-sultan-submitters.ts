import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function fetchPitchSultanSubmitters() {
  try {
    console.log("Fetching all SEC numbers who submitted Pitch Sultan videos...\n");

    // Get all unique SECs who have submitted videos
    const submitters = await prisma.pitchSultanVideo.findMany({
      distinct: ["secUserId"],
      select: {
        secUser: {
          select: {
            id: true,
            secId: true,
            phone: true,
            name: true,
            storeId: true,
            region: true,
          },
        },
      },
      orderBy: {
        uploadedAt: "desc",
      },
    });

    console.log(`Total unique SEC submitters: ${submitters.length}\n`);

    // Extract SEC IDs and phones
    const secNumbers = submitters.map((s) => ({
      secId: s.secUser.secId,
      phone: s.secUser.phone,
      name: s.secUser.name,
      storeId: s.secUser.storeId,
      region: s.secUser.region,
    }));

    // Display results
    console.log("SEC Numbers who submitted Pitch Sultan videos:");
    console.log("=".repeat(80));
    secNumbers.forEach((sec, index) => {
      console.log(
        `${index + 1}. SEC ID: ${sec.secId || "N/A"} | Phone: ${sec.phone} | Name: ${sec.name || "N/A"} | Store: ${sec.storeId || "N/A"} | Region: ${sec.region || "N/A"}`
      );
    });

    // Export to JSON
    const exportData = {
      totalSubmitters: secNumbers.length,
      exportedAt: new Date().toISOString(),
      submitters: secNumbers,
    };

    const fs = await import("fs").then((m) => m.promises);
    const fileName = `exports/pitch-sultan-submitters-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
    await fs.writeFile(fileName, JSON.stringify(exportData, null, 2));

    console.log(`\n✓ Data exported to: ${fileName}`);
    console.log(`\nSummary:`);
    console.log(`- Total submitters: ${secNumbers.length}`);
    console.log(
      `- SEC IDs available: ${secNumbers.filter((s) => s.secId).length}`
    );
    console.log(
      `- Phone numbers: ${secNumbers.filter((s) => s.phone).length}`
    );
  } catch (error) {
    console.error("Error fetching submitters:", error);
  } finally {
    await prisma.$disconnect();
  }
}

fetchPitchSultanSubmitters();
