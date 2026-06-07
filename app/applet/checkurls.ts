async function run() {
  const urls = [
    "https://raw.githubusercontent.com/edibrata/image/main/Logo%20PGRI%20Official%20Full.png",
    "https://raw.githubusercontent.com/edibrata/image/main/Logo%20PGRI.png",
    "https://raw.githubusercontent.com/edibrata/image/main/Kop%20Konkerkab-1.2.png",
  ];
  for (const url of urls) {
    try {
      const r = await fetch(url);
      console.log(r.status, url);
    } catch(e) {
      console.log(e.message, url);
    }
  }
}
run();
