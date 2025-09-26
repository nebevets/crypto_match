document.addEventListener("DOMContentLoaded", () => {
  const coinsData = [
    new Coin("Cardano", "ada", "images/ada.png", 0.81),
    new Coin("Binance", "bnb", "images/bnb.png", 5.72),
    new Coin("Bitcoin", "btc", "images/btc.png", 3977.1),
    new Coin("Dash", "dash", "images/dash.png", 86.43),
    new Coin("Ethereum", "eth", "images/eth.png", 111.44),
    new Coin("Litecoin", "ltc", "images/ltc.png", 31.67),
    new Coin("Stellar", "xlm", "images/xlm.png", 0.15),
    new Coin("Ripple", "xrp", "images/xrp.png", 0.35),
    new Coin("Monero", "xmr", "images/xmr.png", 57.25),
  ];
  const wallet = new Wallet(coinsData);
  const game = new Game(wallet);
  const market = new Market(coinsData);
  const ui = new UI(game, market);
  ui.initialize();
  market.startUpdating();
});

class Coin {
  constructor(name, symbol, src, price) {
    this.name = name;
    this.symbol = symbol;
    this.src = src;
    this.price = price;
    this.quantity = 0;
    this.state = "hidden";
  }
  addQuantity(amount) {
    this.quantity += amount;
  }
  updatePrice(newPrice) {
    this.price = newPrice;
  }
}

class Game {
  constructor(wallet) {
    this.wallet = wallet;
    this.gamesPlayed = 0;
    this.tries = 0;
    this.matches = 0;
    this.maxMatches = 0;
    this.coins = [];
    this.locked = false;
    this.backImgPath = "images/back.png";
  }
  startNewGame(coins) {
    this.gamesPlayed++;
    this.tries = 0;
    this.matches = 0;
    this.maxMatches = coins.length;
    const doubledArray = [...coins, ...coins];
    for (let i = doubledArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [doubledArray[i], doubledArray[j]] = [doubledArray[j], doubledArray[i]];
    }
    this.coins = doubledArray.map(
      (coin) => new Coin(coin.name, coin.symbol, coin.src, coin.price)
    );
    this.coins.forEach((coin) => (coin.state = "hidden"));
    this.locked = false;
  }
  handleClick(index, onUpdate, onMatch, onMismatch, onGameOver) {
    if (this.locked) return;
    const coin = this.coins[index];
    if (!coin || coin.state !== "hidden") return;
    coin.state = "revealed";
    onUpdate();
    const revealedUnmatched = this.coins
      .map((c, i) => ({ c, i }))
      .filter(({ c }) => c.state === "revealed");
    if (revealedUnmatched.length === 2) {
      this.locked = true;
      this.tries++;
      const [first, second] = revealedUnmatched;
      if (first.c.symbol === second.c.symbol) {
        first.c.state = "matched";
        second.c.state = "matched";
        this.matches++;
        this.wallet.getCoinBySymbol(first.c.symbol).addQuantity(1);
        this.wallet.updateTotal();
        onMatch([first.i, second.i]);
        this.locked = false;
        if (this.matches === this.maxMatches) {
          onGameOver();
        }
      } else {
        onMismatch([first.i, second.i]);
        setTimeout(() => {
          first.c.state = "hidden";
          second.c.state = "hidden";
          this.locked = false;
          onUpdate();
        }, 1000);
      }
    }
  }
  calculateAccuracy() {
    if (this.tries === 0) return 0;
    return ((this.matches / this.tries) * 100).toFixed(2);
  }
}

class Market {
  constructor(coins = []) {
    this.coins = coins;
    this.volatility = 0.03;
    this.minPrice = 0.01;
    this.updateInterval = null;
    this.walletEl = document.getElementById("wallet");
    this.marketPriceSpans = [];
  }
  startUpdating(interval = 5000) {
    if (this.updateInterval) return;
    this.updateInterval = setInterval(() => this.updatePrices(), interval);
  }
  stopUpdating() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }
  createWalletUI() {
    this.walletEl.innerHTML = "";
    this.coins.forEach((coin) => {
      const coinRow = document.createElement("tr");
      coinRow.className = `coin-row`;
      coinRow.innerHTML = `
        <td class="symbol">
        <img src="${coin.src}" alt="${coin.name}" />
      ${coin.symbol.toUpperCase()} </td>
        <td class="name">${coin.name}</td>
        <td class="price" id="price-${coin.symbol}">$${coin.price.toFixed(
        2
      )}</td>
      `;
      this.walletEl.appendChild(coinRow);
      this.marketPriceSpans.push(
        document.getElementById(`price-${coin.symbol}`)
      );
    });
  }
  updatePrices() {
    this.coins.forEach((coin) => {
      let oldPrice = coin.price;
      let rand1 = Math.random();
      let rand2 = Math.random();
      let gaussian =
        Math.sqrt(-2 * Math.log(rand1)) * Math.cos(2 * Math.PI * rand2);
      let percentChange = gaussian * this.volatility;
      let newPrice = oldPrice * (1 + percentChange);
      newPrice = Math.max(newPrice, this.minPrice);
      coin.updatePrice(newPrice);
    });
    this.updatePricesUI();
  }
  updatePricesUI() {
    this.marketPriceSpans.forEach((el) => {
      const symbol = el.id.replace("price-", "");
      const coin = this.coins.find((c) => c.symbol === symbol);
      if (coin) {
        el.textContent = `$${coin.price.toFixed(2)}`;
      }
    });
  }
}

class UI {
  constructor(game, market) {
    this.game = game;
    this.market = market;
    this.gamesPlayedEl = document.getElementById("gamesPlayed");
    this.triesEl = document.getElementById("tries");
    this.accuracyEl = document.getElementById("accuracy");
    this.gameAreaEl = document.getElementById("gameArea");
    this.resetButtonEl = document.querySelector("button.reset");
    this.messageEl = document.getElementById("message");
    this.totalUSDEl = document.getElementById("totalUSD");
    this.msgTimeOut = null;
    this.coinsData = market.coins;
    if (this.resetButtonEl) {
      this.resetButtonEl.addEventListener("click", () => this.startGameUI());
    }
  }
  showMessage(msg, timeout = 1500) {
    clearTimeout(this.msgTimeOut);
    this.messageEl.textContent = msg;
    this.messageEl.classList.remove("hidden");
    if (timeout > 0) {
      this.msgTimeOut = setTimeout(() => {
        this.messageEl.classList.add("hidden");
      }, timeout);
    }
  }
  initialize() {
    this.market.createWalletUI();
    this.startGameUI();
  }
  renderGameBoard() {
    this.gameAreaEl.innerHTML = "";
    this.game.coins.forEach((coin, index) => {
      const coinBtn = document.createElement("button");
      coinBtn.className = "coin";
      coinBtn.type = "button";
      coinBtn.dataset.index = index;

      if (coin.state === "hidden") {
        coinBtn.classList.add("back");
        coinBtn.classList.remove("revealed", "matched");
        coinBtn.style.backgroundImage = `url(${this.game.backImgPath})`;
        coinBtn.setAttribute("aria-label", "Click to reveal this coin");
      } else if (coin.state === "revealed") {
        coinBtn.classList.remove("back");
        coinBtn.classList.add("revealed");
        coinBtn.style.backgroundImage = `url(${coin.src})`;
        coinBtn.setAttribute("aria-label", `Revealed: ${coin.name}`);
      } else if (coin.state === "matched") {
        coinBtn.classList.remove("back");
        coinBtn.classList.add("matched");
        coinBtn.style.backgroundImage = `url(${coin.src})`;
        coinBtn.setAttribute("aria-label", `Matched: ${coin.name}`);
        coinBtn.disabled = true; // Prevent further interaction
      }

      coinBtn.addEventListener("click", () => {
        this.game.handleClick(
          index,
          () => this.renderGameBoard(),
          (matchIndices) => {
            this.showMessage("That's a match, nice!!");
            this.renderGameBoard();
          },
          (mismatchIndices) => {
            this.showMessage("Those don't match, fail!");
            this.renderGameBoard();
            setTimeout(() => {
              this.showMessage("Try again");
            }, 1000);
          },
          () => {
            setTimeout(() => {
              this.showMessage("Game over");
              this.startGameUI();
            }, 1500);
          }
        );
        this.updateStatsUI();
      });

      this.gameAreaEl.appendChild(coinBtn);
    });
  }
  updateStatsUI() {
    this.gamesPlayedEl.textContent = this.game.gamesPlayed;
    this.triesEl.textContent = this.game.tries;
    this.accuracyEl.textContent = this.game.calculateAccuracy();
    this.totalUSDEl.textContent = "$" + this.game.wallet.totalUSD.toFixed(2);
  }
  startGameUI() {
    this.game.startNewGame(this.coinsData);
    this.updateStatsUI();
    this.renderGameBoard();
    this.showMessage("Starting game...");
  }
}

class Wallet {
  constructor(coins = []) {
    this.coins = coins;
    this.totalUSD = 0;
  }
  getCoinBySymbol(symbol) {
    return this.coins.find((coin) => coin.symbol === symbol);
  }
  updateTotal() {
    this.totalUSD = this.coins.reduce(
      (total, coin) => total + coin.price * coin.quantity,
      0
    );
  }
}
