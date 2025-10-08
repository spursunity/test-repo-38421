// === Суперобеспеченная инициализация Supabase ===
function initSupabaseClient(callback, retries = 0) {
  const MAX_RETRIES = 10;
  const RETRY_DELAY = 200;

  if (typeof window.supabase !== 'undefined') {
    // Supabase доступен - инициализируем клиент
    const SUPABASE_URL = "https://bayewbsftycasohrewrv.supabase.co";
    const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJheWV3YnNmdHljYXNvaHJld3J2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4NzQzMjYsImV4cCI6MjA3NTQ1MDMyNn0.oWx723ntUOPYomKo8xPCDp_iUP2Qa62ux5FfwkB7rU0";
    const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    callback(supabaseClient);
  } else {
    // Supabase еще не загружен
    if (retries < MAX_RETRIES) {
      console.warn(`Supabase not available yet, retry ${retries + 1}/${MAX_RETRIES}`);
      setTimeout(() => initSupabaseClient(callback, retries + 1), RETRY_DELAY);
    } else {
      console.error('Failed to initialize Supabase after maximum retries');
    }
  }
}

// === Основная логика приложения ===
initSupabaseClient((supabase) => {
  function getRoomId() {
    const url = new URL(window.location.href);
    let room = url.searchParams.get("room");
    if (!room) {
      // создаём новую комнату, редиректим пользователя
      room = crypto.randomUUID();
      url.searchParams.set("room", room);
      window.location.replace(url.toString());
      return null;
    }
    return room;
  }

  const roomId = getRoomId();

  // === Игровое состояние ===
  let localPlayerId = crypto.randomUUID();
  let currentGame = null;
  let boardState = Array(25).fill(null);
  let players = [];
  let currentPlayer = 1;
  let currentWord = "";
  let scores = { player1: 0, player2: 0 };
  let status = "waiting";

  // === Supabase helpers ===
  async function loadGame(id) {
    const { data } = await supabase.from("games").select("*").eq("id", id).single();
    return data;
  }

  async function createGame(id, word) {
    const { data } = await supabase.from("games").insert([{
        id: id,
        board_state: JSON.stringify(Array(25).fill(null)),
        word,
        players: JSON.stringify([{id: localPlayerId, name: "Игрок 1"}]),
        scores: JSON.stringify({player1: 0, player2: 0}),
        status: "waiting"
    }]);
    return data;
  }

  async function joinGame(id) {
    // Обновить поле игроки в БД, если 2 игрока
    const game = await loadGame(id);
    let ps = game.players ? JSON.parse(game.players) : [];
    if (ps.length < 2 && !ps.some(u => u.id === localPlayerId)) {
      ps.push({id: localPlayerId, name: `Игрок ${ps.length+1}`});
      await supabase.from("games").update({ players: JSON.stringify(ps), status: ps.length === 2 ? "active" : "waiting" }).eq("id", id);
    }
  }

  async function updateGame(id, gameUpdate) {
    await supabase.from("games").update(gameUpdate).eq("id", id);
  }

  // === Realtime подписка ===
  function subscribeGame(id, handler) {
    supabase.channel(`room:${id}`)
      .on('postgres_changes', { event: "*", schema: "public", table: "games", filter: `id=eq.${id}` }, payload => {
        handler(payload.new);
      })
  .subscribe();
  }

  // === UI обработка ===
  // Добавь здесь биндинг UI (элементы и обработчики кнопок, синхронизация boardState с DOM и т.д.)
  // В функции handleGameUpdate обновляй UI при поступлении новых данных (board, очки, статусы)

  async function init() {
    if (!roomId) return; // после редиректа
    let game = await loadGame(roomId);
    if (!game) {
      // Создать новую игру (запрос слова у пользователя)
      const word = prompt("Введите слово для угадывания:");
      await createGame(roomId, word);
      game = await loadGame(roomId);
    }
    await joinGame(roomId);
    // Подписка на обновления
    subscribeGame(roomId, handleGameUpdate);
    // Инициализация UI (отрисовать board и проч.)
    handleGameUpdate(game);
    // Пример для кнопки "Угадать"
    document.getElementById('guess-btn').onclick = async function() {
      const val = document.getElementById('word-input').value;
      // Логика проверки/обновления boardState
      // ...
      await updateGame(roomId, { /* board_state, scores и др. */ });
    }
    // Добавь аналогично для других кнопок (skip, new game)
  }

  function handleGameUpdate(game) {
    // Рендерить boardState, обновлять очки, статус, кто теперь ходит и т.д.
    // Можно вставить логику изменения DOM отсюда
    currentGame = game;
    boardState = JSON.parse(game.board_state);
    players = JSON.parse(game.players);
    scores = JSON.parse(game.scores);
    status = game.status;
    // Здесь обновляй DOM: поле, очки, текст текущего игрока и т.д.
  }

  // === Старт ===
  init();
});
