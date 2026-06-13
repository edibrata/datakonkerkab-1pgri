import { useEffect, useState } from "react";
import { collection, doc, onSnapshot } from "firebase/firestore";
import { db, loginAnonymously } from "../lib/firebase";
import { CUSTOM_APP_ID } from "../lib/constants";
import { SubmissionData } from "../types";

export const useFirebaseData = () => {
  const [submissions, setSubmissions] = useState<SubmissionData[]>([]);
  const [attendanceLogs, setAttendanceLogs] = useState<any[]>([]);
  const [confirmations, setConfirmations] = useState<any[]>([]);
  const [isRegistrationOpen, setIsRegistrationOpen] = useState(true);
  const [activeEventId, setActiveEventId] = useState<string>("");
  const [trashRecords, setTrashRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loginAnonymously();

    const colRef = collection(
      db,
      "artifacts",
      CUSTOM_APP_ID,
      "public",
      "data",
      "pendaftar",
    );
    const unsubPendaftar = onSnapshot(
      colRef,
      (snapshot) => {
        const data: SubmissionData[] = [];
        snapshot.forEach((doc) => {
          data.push({ ...doc.data(), id: doc.id } as SubmissionData);
        });
        setSubmissions(data);
        setLoading(false);
      },
      (error) => {
        console.error("Firestore Listen Error:", error);
        setLoading(false);
      },
    );

    const logsRef = collection(db, "attendanceLogs");
    const unsubLogs = onSnapshot(logsRef, (snapshot) => {
      const logs: any[] = [];
      snapshot.forEach((doc) => {
        logs.push({ ...doc.data(), id: doc.id });
      });
      setAttendanceLogs(logs);
    });

    const confRef = collection(db, "confirmations");
    const unsubConf = onSnapshot(confRef, (snapshot) => {
      const confs: any[] = [];
      snapshot.forEach((doc) => {
        confs.push({ ...doc.data(), id: doc.id });
      });
      setConfirmations(confs);
    });

    const trashRef = collection(
      db,
      "artifacts",
      CUSTOM_APP_ID,
      "public",
      "data",
      "pendaftar_trash",
    );
    const unsubTrash = onSnapshot(trashRef, (snapshot) => {
      const data: any[] = [];
      snapshot.forEach((doc) => {
        data.push({ ...doc.data(), id: doc.id });
      });
      setTrashRecords(data);
    });

    const settingsRef = doc(
      db,
      "artifacts",
      CUSTOM_APP_ID,
      "public",
      "settings",
    );
    const unsubSettings = onSnapshot(settingsRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setIsRegistrationOpen(data.isOpen ?? true);
        setActiveEventId(data.activeEventId || "");
      } else {
        setIsRegistrationOpen(true);
        setActiveEventId("");
      }
    });

    return () => {
      unsubPendaftar();
      unsubLogs();
      unsubConf();
      unsubTrash();
      unsubSettings();
    };
  }, []);

  return { submissions, attendanceLogs, confirmations, trashRecords, isRegistrationOpen, activeEventId, loading };
};
