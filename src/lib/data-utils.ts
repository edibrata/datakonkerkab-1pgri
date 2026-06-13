import { SubmissionData, FlatAdminRow } from "../types";

export const MALE_ROOMS = [
  "ALPHA-17", "ALPHA-19", "ALPHA-21", "ALPHA-23", "ALPHA-25", "ALPHA-27", "ALPHA-29", "ALPHA-31", "ALPHA-33",
  "ALPHA-8", "ALPHA-10", "ALPHA-12", "ALPHA-14", "ALPHA-16", "ALPHA-18", "ALPHA-20", "ALPHA-22", "ALPHA-24", "ALPHA-26", "ALPHA-28", "ALPHA-30",
  "SUPERIOR-14", "SUPERIOR-16", "SUPERIOR-18", "SUPERIOR-20", "SUPERIOR-22", "SUPERIOR-24", "SUPERIOR-26"
];

export const FEMALE_ROOMS = [
  "ALPHA-1", "ALPHA-3", "ALPHA-5", "ALPHA-7", "ALPHA-9", "ALPHA-11", "ALPHA-15"
];

export function getFlattenedRows(
  submissions: SubmissionData[],
  sortConfig: { key: string; dir: number } = { key: "ts", dir: -1 }
): FlatAdminRow[] {
  let allPeserta: FlatAdminRow[] = [];
  let others: FlatAdminRow[] = [];

  submissions.forEach((sub) => {
    const normalizedKat =
      sub.kategori && sub.kategori.toUpperCase().includes("PESERTA")
        ? "PESERTA CABANG"
        : sub.kategori || "";
        
    // Support both new flattened format (p1_nama) and old nested array format (peserta)
    const list = Array.isArray((sub as any).peserta)
        ? (sub as any).peserta
        : (((sub as any).peserta || {}) as any).peserta || [];
        
    const getField = (i: number, field: string) => {
        return (sub as any)[`p${i}_${field}`] || (list[i-1] ? list[i-1][field] : "") || "";
    };

    for (let i = 1; i <= Math.max(4, list.length || 4); i++) {
      const nm = getField(i, "nama");
      if (!nm) continue;

      const pData: FlatAdminRow = {
        id: sub.id!,
        sD: sub,
        i,
        branch: (
          normalizedKat === "PENINJAU"
            ? (sub.nama_cabang || "").replace("PENINJAU - ", "")
            : sub.nama_cabang || "TANPA CABANG"
        ).trim().toUpperCase(),
        name: nm,
        jabatan: getField(i, "jabatan") || "-",
        jk: (getField(i, "jk") || "LAKI-LAKI").trim().toUpperCase(),
        foto: getField(i, "foto"),
        wa: getField(i, "wa") || "-",
        kom: getField(i, "komisi") || "-",
        token: sub.revision_token || "-",
        ts: sub.waktu_simpan || "-",
        kategori: normalizedKat,
        mandat: sub.link_mandat || "-",
      };

      if (normalizedKat === "PESERTA CABANG") allPeserta.push(pData);
      else others.push(pData);
    }
  });

  // Room Logic (Pooling Gender - ONLY FOR PESERTA CABANG)
  const males = allPeserta
    .filter((p) => p.jk === "LAKI-LAKI")
    .sort((a, b) => a.branch.localeCompare(b.branch));
  const females = allPeserta
    .filter((p) => p.jk === "PEREMPUAN")
    .sort((a, b) => a.branch.localeCompare(b.branch));

  const assignRooms = (people: FlatAdminRow[], availableRooms: string[]) => {
    const overridePeople = people.filter((p) => {
      const ovr = (p.sD as any)[`p${p.i}_room_override`];
      return ovr && availableRooms.includes(ovr);
    });
    overridePeople.forEach((p) => {
      p.room = (p.sD as any)[`p${p.i}_room_override`];
    });

    const normalPeople = people.filter((p) => {
      const ovr = (p.sD as any)[`p${p.i}_room_override`];
      return !ovr || !availableRooms.includes(ovr);
    });

    const rooms = availableRooms.map((name) => ({
      name,
      occupants: [],
      capacity: 4,
    }));

    // Account for valid overrides
    overridePeople.forEach((p) => {
      const r = rooms.find((room) => room.name === p.room);
      if (r && r.capacity > 0) r.capacity -= 1;
    });

    const getEmptyRoom = () =>
      rooms.find((r) => r.occupants.length === 0 && r.capacity === 4);

    const byBranch: Record<string, FlatAdminRow[]> = {};
    for (const p of normalPeople) {
      if (!byBranch[p.branch]) byBranch[p.branch] = [];
      byBranch[p.branch].push(p);
    }

    const remainders: FlatAdminRow[][] = [];

    // 1. Give full rooms to branches with >= 4 people
    for (const branch of Object.keys(byBranch).sort()) {
      const group = byBranch[branch];
      while (group.length >= 4) {
        const room = getEmptyRoom();
        if (!room) break; // Out of empty rooms
        const chunk = group.splice(0, 4);
        chunk.forEach((p) => (p.room = room.name));
        room.occupants.push(...(chunk as never[]));
        room.capacity -= 4;
      }
      if (group.length > 0) {
        remainders.push(group);
      }
    }

    // OPSI 4: Sequential Filling for Remainders
    const sequentialQueue: FlatAdminRow[] = [];
    
    const remaindersSorted = remainders.sort((a, b) => a[0].branch.localeCompare(b[0].branch));
    for (const group of remaindersSorted) {
      sequentialQueue.push(...group);
    }

    // Distribute them sequentially into the remaining capacity of all rooms
    let qIdx = 0;
    for (const room of rooms) {
      while (room.capacity > 0 && qIdx < sequentialQueue.length) {
        const person = sequentialQueue[qIdx];
        person.room = room.name;
        room.occupants.push(person as never);
        room.capacity -= 1;
        qIdx++;
      }
    }

    // Any remaining people go to waiting list
    while (qIdx < sequentialQueue.length) {
      sequentialQueue[qIdx].room = "Waiting List";
      qIdx++;
    }

    // Safety net
    normalPeople.forEach((p) => {
      if (!p.room) p.room = "Waiting List";
    });
  };

  assignRooms(males, MALE_ROOMS);
  assignRooms(females, FEMALE_ROOMS);

  others.forEach((p) => {
    p.room = (p.sD as any)[`p${p.i}_room_override`] || "X";
  });

  const rows = [...allPeserta, ...others];

  rows.sort((a, b) => {
    const key = sortConfig.key as keyof FlatAdminRow | "kaos" | "idx";
    let vA, vB;
    if (key === "kaos") {
      vA = (a.sD as any)[`p${a.i}_kaos`] || "";
      vB = (b.sD as any)[`p${b.i}_kaos`] || "";
    } else if (key === "idx") {
      vA = 0;
      vB = 0;
    } else {
      vA = a[key as keyof FlatAdminRow] || "";
      vB = b[key as keyof FlatAdminRow] || "";
    }
    return (vA < vB ? -1 : 1) * sortConfig.dir;
  });

  return rows;
}

export interface LeaderboardEntry {
  participantId: string;
  name: string;
  branch: string;
  kategori: string;
  attendancesCount: number;
  totalTimeScore: number;
  poinKecepatan: number;
  rank: number;
}

export const getLeaderboard = (flattenedRows: FlatAdminRow[], attendanceLogs: any[]): LeaderboardEntry[] => {
  const filteredLogs = attendanceLogs.filter(log => !log.eventId.includes("makan"));

  // 1. Calculate speed points for each log per event
  const eventsMap = new Map<string, any[]>();
  filteredLogs.forEach(log => {
      const arr = eventsMap.get(log.eventId) || [];
      arr.push(log);
      eventsMap.set(log.eventId, arr);
  });

  const speedPointsMap = new Map<string, number>();
  eventsMap.forEach((logs, eventId) => {
      logs.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      logs.forEach((log, idx) => {
          // fastest gets 100, then decreases by 1, minimum 50
          const pts = Math.max(50, 100 - idx);
          speedPointsMap.set(`${log.participantId}-${eventId}`, pts);
      });
  });

  const leaderboard = flattenedRows.map(row => {
    const pId = `${row.id}-${row.i}`;
    const logsForUser = filteredLogs.filter(log => log.participantId === pId);
    
    // Calculate score
    const attendancesCount = logsForUser.length;
    const totalTimeScore = logsForUser.reduce((sum, log) => sum + new Date(log.timestamp).getTime(), 0);
    const poinKecepatan = logsForUser.reduce((sum, log) => sum + (speedPointsMap.get(`${pId}-${log.eventId}`) || 0), 0);

    return {
      participantId: pId,
      name: row.name,
      branch: row.branch || "-",
      kategori: row.kategori || "-",
      attendancesCount,
      totalTimeScore,
      poinKecepatan
    };
  });

  // Filter out those with 0 attendance if we want, or keep them at the bottom.
  // We should keep everyone and rank them, or only rank those with >0 attendees. 
  // Let's rank everyone, but sort by attendance first.
  leaderboard.sort((a, b) => {
    if (b.attendancesCount !== a.attendancesCount) {
      return b.attendancesCount - a.attendancesCount; // Descending
    }
    // If same attendance count, tie-break by totalTimeScore (ascending - lower sum is earlier)
    // However, if count is 0, totalTimeScore is 0.
    if (a.attendancesCount === 0) return 0;
    return a.totalTimeScore - b.totalTimeScore;
  });

  let currentRank = 1;
  return leaderboard.map((entry, idx) => {
    return {
      ...entry,
      rank: entry.attendancesCount > 0 ? idx + 1 : 9999
    };
  });
};
