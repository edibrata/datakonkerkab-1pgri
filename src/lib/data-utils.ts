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
  search: string = "",
  filter: string = "",
  sortConfig: { key: string; dir: number } = { key: "ts", dir: -1 }
): FlatAdminRow[] {
  let allPeserta: FlatAdminRow[] = [];
  let others: FlatAdminRow[] = [];

  submissions.forEach((sub) => {
    const normalizedKat =
      sub.kategori && sub.kategori.toUpperCase().includes("PESERTA")
        ? "PESERTA CABANG"
        : sub.kategori || "";
    for (let i = 1; i <= 4; i++) {
      const nm = (sub as any)[`p${i}_nama`] || "";
      if (!nm) continue;
      if (filter && normalizedKat !== filter) continue;
      if (
        search &&
        ![sub.nama_cabang, nm, sub.kategori].some((x) =>
          x?.toLowerCase().includes(search.toLowerCase()),
        )
      )
        continue;

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
        jabatan: (sub as any)[`p${i}_jabatan`] || "-",
        jk: ((sub as any)[`p${i}_jk`] || "LAKI-LAKI").trim().toUpperCase(),
        foto: (sub as any)[`p${i}_foto`],
        wa: (sub as any)[`p${i}_wa`] || "-",
        kom: (sub as any)[`p${i}_komisi`] || "-",
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
