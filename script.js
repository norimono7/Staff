const stations = [
  "つのやま", "北村田市", "十一見市", "見市入口", "見市兵申",
  "見市公園前", "岡見市江", "見市国立病院", "見市", "見市車庫",
  "見市南", "木山", "十市野", "見市市役所前", "見市大学", "見市比", "見市中央"
];

const services = {
  local: {
    label: "普通",
    color: "#2f9b72",
    note: "全駅に停車します。見市車庫で乗務員交代を行います。",
    stops: stations.map(() => true)
  },
  semiRapid: {
    label: "準急",
    color: "#4775d1",
    note: "主要駅に停車します。通過駅は(レ)で表示します。",
    stops: [true, true, false, true, false, true, false, true, true, true, false, true, false, true, true, false, true]
  },
  rapid: {
    label: "快速",
    color: "#e5ad1b",
    note: "主要駅のみ停車します。通過駅は(レ)で表示します。",
    stops: [true, false, false, true, false, false, true, false, true, true, false, false, true, false, true, false, true]
  },
  express: {
    label: "急行",
    color: "#e64e78",
    note: "停車駅を絞った急行です。通過駅は(レ)で表示します。",
    stops: [true, false, false, false, false, true, false, false, true, true, false, false, false, true, false, false, true]
  }
};

const $ = (id) => document.getElementById(id);
const origin = $("origin");
const destination = $("destination");
const service = $("service");
const minutes = $("minutes");
const timetable = $("timetable");
const routeLine = $("route-line");
const confirmSettings = $("confirm-settings");
const settingStatus = $("setting-status");
const settingInputs = [origin, destination, service, minutes];
let isLocked = false;

stations.forEach((station, index) => {
  origin.add(new Option(station, index));
  destination.add(new Option(station, index));
});
destination.value = String(stations.length - 1);
Object.entries(services).forEach(([key, data]) => service.add(new Option(data.label, key)));

function pad(value) { return String(value).padStart(2, "0"); }
function formatTime(date) { return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`; }
function formatDate(date) {
  const weekdays = ["日", "月", "火", "水", "木", "金", "土"];
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日（${weekdays[date.getDay()]}）`;
}
function timeFromSeconds(seconds) {
  const date = new Date(seconds * 1000);
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function updateClock() {
  const now = new Date();
  $("now").textContent = formatTime(now);
  $("today").textContent = formatDate(now);
}

function buildRoute() {
  routeLine.innerHTML = "";
  const from = Number(origin.value);
  const to = Number(destination.value);
  const direction = from <= to ? 1 : -1;
  const route = [];
  for (let i = from; direction > 0 ? i <= to : i >= to; i += direction) route.push(i);
  route.forEach((index, position) => {
    const item = document.createElement("div");
    item.className = "route-station" + (position === 0 || position === route.length - 1 ? " active" : "");
    item.innerHTML = `<b></b><span>${stations[index]}</span>`;
    routeLine.appendChild(item);
  });
}

function render() {
  const from = Number(origin.value);
  const to = Number(destination.value);
  const direction = from <= to ? 1 : -1;
  const selected = services[service.value];
  const route = [];
  for (let i = from; direction > 0 ? i <= to : i >= to; i += direction) route.push(i);
  const departure = new Date(Date.now() + Math.max(0, Number(minutes.value) || 0) * 60 * 1000);
  let current = departure.getTime() / 1000;
  const rows = [];

  route.forEach((stationIndex, position) => {
    const isOrigin = position === 0;
    const isTerminal = position === route.length - 1;
    const stopsHere = isOrigin || isTerminal || selected.stops[stationIndex];
    const arrival = current;
    const departureAt = isTerminal ? current : current + (stopsHere ? 30 : 0);
    const note = isOrigin ? "始発" : isTerminal ? "終着" : stationIndex === 9 && selected.label === "普通" ? "乗務員交代" : stopsHere ? "停車" : "(レ) 通過";
    rows.push({ stationIndex, arrival, departureAt, stopsHere, note, isOrigin, isTerminal });
    if (!isTerminal) current = departureAt + 80;
  });

  $("service-note").innerHTML = `<span style="color:${selected.color};font-weight:800">${selected.label}</span>　${selected.note}`;
  $("summary").innerHTML = `${stations[from]} 発 <strong>${formatTime(new Date(departure))}</strong>　→　${stations[to]} 着 <strong>${timeFromSeconds(rows[rows.length - 1].arrival)}</strong>　／　${selected.label}　全${route.length}駅`;
  timetable.innerHTML = rows.map((row, index) => {
    const travel = index === 0 ? "—" : "1分20秒";
    const classes = `${row.stopsHere ? "" : "pass"} ${row.isTerminal ? "terminal" : ""}`;
    const arrival = row.isOrigin ? "—" : timeFromSeconds(row.arrival);
    const note = row.note === "乗務員交代" ? `<span class="change">${row.note}</span>` : row.note;
    return `<tr class="${classes}">
      <td>${stations[row.stationIndex]}</td>
      <td>${arrival}</td>
      <td>${timeFromSeconds(row.departureAt)}</td>
      <td>${travel}</td>
      <td>${note}</td>
    </tr>`;
  }).join("");
  buildRoute();
}

function setLocked(locked) {
  isLocked = locked;
  settingInputs.forEach((element) => { element.disabled = locked; });
  confirmSettings.textContent = locked ? "設定をやり直す" : "設定完了";
  settingStatus.textContent = locked
    ? "設定完了：この時刻表の時刻は固定されています"
    : "設定前：内容を確認して設定完了を押してください";
  settingStatus.classList.toggle("is-locked", locked);
}

settingInputs.forEach((element) => element.addEventListener("input", () => {
  if (!isLocked) render();
}));
confirmSettings.addEventListener("click", () => {
  if (isLocked) {
    setLocked(false);
    render();
    return;
  }
  render();
  setLocked(true);
});
$("reset").addEventListener("click", () => {
  origin.value = "0";
  destination.value = String(stations.length - 1);
  service.value = "local";
  minutes.value = "5";
  setLocked(false);
  render();
});

updateClock();
setLocked(false);
render();
setInterval(updateClock, 1000);
