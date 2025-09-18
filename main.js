const $document = $(document);

class Coin {
  constructor(name, symbol, src, price) {
    this.name = name;
    this.symbol = symbol;
    this.src = src;
    this.price = price;
    this.quantity = 0;
    this.state = "hidden"; // 'hidden', 'revealed', 'matched'
  }
  addQuantity(amount) {
    this.quantity += amount;
  }
  updatePrice(newPrice) {
    this.price = newPrice;
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

class Game {
  constructor(wallet) {
    this.wallet = wallet;
    this.gamesPlayed = 0;
    this.tries = 0;
    this.matches = 0;
    this.maxMatches = 0;
    this.coins = [];
    this.locked = false;
  }
  startNewGame(coins) {
    this.gamesPlayed++;
    this.tries = 0;
    this.matches = 0;
    this.maxMatches = coins.length;
    // Duplicate and shuffle coins for the board
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

    // Reveal coin
    coin.state = "revealed";
    onUpdate();

    // Get all currently revealed but unmatched coins
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
  }
}

class UI {
  constructor(game, market) {
    this.game = game;
    this.market = market;
    this.$gamesPlayed = $("#gamesPlayed");
    this.$tries = $("#tries");
    this.$accuracy = $("#accuracy");
    this.$wallet = $("#wallet");
    this.$gameArea = $("#gameArea");
    this.$resetButton = $("button.reset");
    this.$message = $("#message");
    this.$totalUSD = $("#totalUSD");
    this.$marketPriceSpans = [];
    this.msgTimeOut = null;
    this.coinsData = market.coins;
    this.$resetButton.on("click", () => this.startGameUI());
  }

  showMessage(msg, timeout = 1500) {
    clearTimeout(this.msgTimeOut);
    this.$message.text(msg).removeClass("hidden");
    if (timeout > 0) {
      this.msgTimeOut = setTimeout(() => {
        this.$message.addClass("hidden");
      }, timeout);
    }
  }

  initialize() {
    this.createWalletUI();
    this.startGameUI();
  }

  createWalletUI() {
    this.$wallet.empty();
    const $header = $(`
      <div class="coin even" style="font-weight:bold;">
        <span class="symbol">Symbol</span>
        <span class="name">Name</span>
        <span class="price">Price</span>
      </div>
    `);
    this.$wallet.append($header);
    this.market.coins.forEach((coin, idx) => {
      const evenClass = idx % 2 === 0 ? "even" : "";
      const $coinDiv = $(`
        <div class="coin ${evenClass}">
          <span class="symbol">${coin.symbol.toUpperCase()} <img src="${
        coin.src
      }" alt="${coin.name}" /></span>
          <span class="name">${coin.name}</span>
          <span class="price" id="price-${coin.symbol}">$${coin.price.toFixed(
        2
      )}</span>
        </div>
      `);
      this.$wallet.append($coinDiv);
      this.$marketPriceSpans.push($(`#price-${coin.symbol}`));
    });
  }

  renderGameBoard() {
    this.$gameArea.empty();
    this.game.coins.forEach((coin, index) => {
      const $cardDiv = $(`
        <div class="card" data-index="${index}">
        </div>
      `);
      $cardDiv
        .toggleClass("matched", coin.state === "matched")
        .toggleClass(
          "revealed",
          coin.state === "revealed" || coin.state === "matched"
        )
        .toggleClass("hidden", coin.state === "hidden");
      // Set background image via CSS classes
      if (coin.state === "hidden") {
        $cardDiv.css("background-image", `url(${this.game.backImgPath})`);
      } else {
        $cardDiv.css("background-image", `url(${coin.src})`);
      }
      $cardDiv.on("click", () => {
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
      this.$gameArea.append($cardDiv);
    });
  }

  updateStatsUI() {
    this.$gamesPlayed.text(this.game.gamesPlayed);
    this.$tries.text(this.game.tries);
    this.$accuracy.text(this.game.calculateAccuracy());
    this.$totalUSD.text("$" + this.game.wallet.totalUSD.toFixed(2));
  }

  startGameUI() {
    this.game.startNewGame(this.coinsData);
    this.updateStatsUI();
    this.renderGameBoard();
    this.showMessage("Starting game...");
  }
}

$document.ready(() => {
  const coinsData = [
    new Coin("Cardano", "ada", "images/ada.png", 0.03),
    new Coin("Binance", "bnb", "images/bnb.png", 5.72),
    new Coin("BitCoin", "btc", "images/btc.png", 3977.1),
    new Coin("Dash", "dash", "images/dash.png", 86.43),
    new Coin("Ethereum", "eth", "images/eth.png", 111.44),
    new Coin("LiteCoin", "ltc", "images/ltc.png", 31.67),
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
