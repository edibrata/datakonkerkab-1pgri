export interface SubmissionData {
  id?: string;
  kategori?: string;
  nama_cabang?: string;
  link_mandat?: string;
  waktu_simpan?: string;
  revision_token?: string;
  
  p1_nama?: string; p1_jabatan?: string; p1_jk?: string; p1_komisi?: string; p1_wa?: string; p1_kaos?: string; p1_foto?: string; p1_room_override?: string;
  p2_nama?: string; p2_jabatan?: string; p2_jk?: string; p2_komisi?: string; p2_wa?: string; p2_kaos?: string; p2_foto?: string; p2_room_override?: string;
  p3_nama?: string; p3_jabatan?: string; p3_jk?: string; p3_komisi?: string; p3_wa?: string; p3_kaos?: string; p3_foto?: string; p3_room_override?: string;
  p4_nama?: string; p4_jabatan?: string; p4_jk?: string; p4_komisi?: string; p4_wa?: string; p4_kaos?: string; p4_foto?: string; p4_room_override?: string;
}

export interface FlatAdminRow {
  id: string;
  sD: SubmissionData;
  i: number;
  branch: string;
  name: string;
  jabatan: string;
  jk: string;
  foto?: string;
  wa: string;
  kom: string;
  token: string;
  ts: string;
  kategori: string;
  mandat: string;
  room?: string | number;
}
