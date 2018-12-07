// stats and associated jQuery objs
var gamesPlayed = 0,
    $gamesPlayed = null;
var tries,
    $tries = null;
var accuracy,
    $accuracy = null;
var matches,
    misses,
    maxMatches;
// jQuery objs
var $wallet = null,
    $gameArea = null,
    $resetButton = null,
    $message = null;

var $marketPriceSpans = [];
var updateIndices = null;
var msgTimeOut = null;

var $firstCoinClicked = null;
var $secondCoinClicked = null;

var deltas = [
    0.0911,
    0.0800,
    0.0614,
    0.0520,
    0.0500,
    0.0468,
    0.0461,
    0.0411,
    0.0379,
    0.0333,
    0.0310,
    0.0290,
    0.0250,
    0.0212,
    0.0199,
    0.0111,
    0.0102,
    0.0100,
    0.0078,
    0.0033,
    0.0000,
    -0.0020,
    -0.0078,
    -0.0102,
    -0.0107,
    -0.0111,
    -0.0129,
    -0.0190,
    -0.0210,
    -0.0221,
    -0.0236,
    -0.0287,
    -0.0341,
    -0.0356,
    -0.0391,
    -0.0420,
    -0.0578,
    -0.0611,
    -0.0711,
    -0.0829,
    -0.0899
];

var coins = [
    {name: 'Cardano', symbol: 'ada', src: "images/ada.png", balance: 0, marketPrice: 0.03}, 
    {name: 'Binance', symbol: 'bnb', src: "images/bnb.png", balance: 0, marketPrice: 5.72},
    {name: 'BitCoin', symbol: 'btc', src: "images/btc.png", balance: 0, marketPrice: 3977.10},
    {name: 'Dash', symbol: 'dash', src: "images/dash.png", balance: 0, marketPrice: 86.43},
    {name: 'Ethereum', symbol: 'eth', src: "images/eth.png", balance: 0, marketPrice: 111.44},
    {name: 'LiteCoin', symbol: 'ltc', src: "images/ltc.png", balance: 0, marketPrice: 31.67},
    {name: 'Stellar', symbol: 'xlm', src: "images/xlm.png", balance: 0, marketPrice: 0.15},
    {name: 'Ripple', symbol: 'xrp', src: "images/xrp.png", balance: 0, marketPrice: 0.35},
    {name: 'Monero', symbol: 'xmr', src: "images/xmr.png", balance: 0, marketPrice: 57.25}
];

var backImgPath = 'images/back.png';

$(document).ready(initializeGame);

function initializeGame(){
    setGameControls();
    setGameEvents();
    createWallet();
    startGame();
}

function setGameControls(){
    $gamesPlayed = $('#gamesPlayed');
    $tries = $('#tries');
    $accuracy = $('#accuracy');
    $wallet = $('#wallet');
    $gameArea = $('#gameArea');
    $resetButton = $('button');
    $message = $('#message');
    $totalUSD = $('#totalUSD');
}

function setGameEvents(){
    $gameArea.on('click', 'img.back', handleClick);
    $resetButton.on('click', startGame);
}

function getRandomIndex(min, max){
  return Math.floor(Math.random()* (max-min+1))+min;
}

function randomizeArray(array){
    var result = [];
    
    while(array.length){
        var randomIndex = getRandomIndex(0, array.length-1);
        result.push(array[randomIndex]);
        array.splice(randomIndex,1)
    }
    return result;
}

function createWallet(){
    var walletArray = coins.slice();
    walletArray.sort(function(a, b){
        if (a.name < b.name)
            return -1
        return 1
    });
    
    for (var index = 0; index < walletArray.length; index++){
        var $coinDiv = $('<div>', {
            'class': walletArray[index].symbol,
            text: ' ' + walletArray[index].name
        });
        if(index % 2 === 0){
            $coinDiv.addClass('even');
        }
        var $balanceSpan = $('<span>', {
            'class': 'balance',
            text: walletArray[index].balance.toFixed(2)
        });
        var $mktPriceSpan = $('<span>', {
            'class': 'marketPrice',
            text: walletArray[index].marketPrice.toFixed(2)
        });
        
        $marketPriceSpans.push($mktPriceSpan);
        
        var $smallIcon = $('<img>', {
            src: walletArray[index].src 
        });
        $coinDiv.prepend($smallIcon);
        $coinDiv.append($balanceSpan, $mktPriceSpan);
        $wallet.append($coinDiv);
    }
}

function createGameCoins(array){
    for (var index = 0; index < array.length; index++){
        var cardDiv = $('<div>', {
            'class': 'card'
        });
        var coinImg = $('<img>', {
            'class': 'front',
            src: array[index].src
        });
        
        var backImg = $('<img>', {
            'class': 'back',
            attr: {
                'symbol': array[index].symbol,
                'coin-name': array[index].name
            },
            src: backImgPath
        });
    
        cardDiv.append(coinImg, backImg);
        $gameArea.append(cardDiv);
    }
}

function handleClick(event){
    event.preventDefault();
    
    var $this = $(this);
    
    if (!$this.hasClass('back') || $this === $firstCoinClicked || ($firstCoinClicked && $secondCoinClicked)){
        return;
    }
    
    var walletBalanceSelector = '';

    if ($firstCoinClicked){
        $secondCoinClicked = $this;
        $secondCoinClicked.toggleClass('hidden');
        
        if ($firstCoinClicked.attr('symbol') === $secondCoinClicked.attr('symbol')){
            ++matches;
            $message.text('That\'s a match. Nice!');
            var accuracy = getAccuracy();
            $accuracy.text(accuracy);

            walletBalanceSelector = '.' + $secondCoinClicked.attr('symbol') + ' .balance';
            var $newCoinBalance = $(walletBalanceSelector);
            $newCoinBalance.text(calculateNewCoinAmount(accuracy, $newCoinBalance.text()));
            
            setTotal();
            
            $firstCoinClicked = null;
            $secondCoinClicked = null;
            if (matches === maxMatches){
                $message.text("GAME OVER")
                manageMarketInterval();
            }else{
                msgTimeOut = setTimeout(function(){
                    $message.text('Select two more...');
                }, 1250);
            }
        }
        else{
            ++misses;
            $message.text('That\'s a miss. Fail!')
            $accuracy.text(getAccuracy());
            setTimeout(function(){
                $message.text('Try Again');
                $secondCoinClicked.toggleClass('hidden');
                $firstCoinClicked.toggleClass('hidden');
                $firstCoinClicked = null;
                $secondCoinClicked = null;
            }, 1250);
            return;
        }        
    }else{
        if(msgTimeOut !== null){
            clearTimeout(msgTimeOut);
            msgTimeOut = null;
        }
        $firstCoinClicked = $this;
        $message.text('You selected: ' + $firstCoinClicked.attr('coin-name'));
        $tries.text(++tries);
        $firstCoinClicked.toggleClass('hidden');
    }
}

function getAccuracy(){
    var newAccuracy = (matches/tries) * 100;
    return newAccuracy.toFixed(2);
}

function startGame(){
    $gamesPlayed.text(++gamesPlayed);
    
    accuracy = 0, tries = 0, matches = 0, misses = 0, maxMatches = 0;
    
    $gameArea.empty();
    $accuracy.text(accuracy);
    $tries.text(tries);
    
    var firstSetCoins = randomizeArray(coins.slice()),
        secondSetCoins = randomizeArray(coins.slice()),
        finalSetCoins = firstSetCoins.concat(secondSetCoins);
    createGameCoins(finalSetCoins);
    if (updateIndices === null){
        manageMarketInterval();
    }
    maxMatches = coins.length;
    $message.text('Select two coins...');
}

function changeIndices(){
    for (var index = 0; index < $marketPriceSpans.length; index++){
        var oldPrice = parseFloat($marketPriceSpans[index].text());
        var randomDeltaIndex = getRandomIndex(0, deltas.length-1);
        var newPrice = oldPrice + (oldPrice * deltas[randomDeltaIndex]);

        if (oldPrice < newPrice){
            $marketPriceSpans[index].removeClass('red');
            $marketPriceSpans[index].addClass('green');
        }
        else if (oldPrice > newPrice){
            $marketPriceSpans[index].removeClass('green');
            $marketPriceSpans[index].addClass('red');
        }
        else{
            $marketPriceSpans[index].removeClass('green');
            $marketPriceSpans[index].removeClass('red');
        }
        $marketPriceSpans[index].text(newPrice.toFixed(2));
    }
    setTotal();
}

function setTotal(){
    var totalUSD = 0;
    
    for (var index = 0; index < $marketPriceSpans.length; index++){
        var currentPrice = parseFloat($marketPriceSpans[index].text());
        var currentBalance = parseFloat($marketPriceSpans[index].parent().children('span.balance').text());
        totalUSD += currentPrice * currentBalance;
    }
    $totalUSD.text('$' + totalUSD.toFixed(2));
}

function manageMarketInterval(){
    if (updateIndices === null){
        updateIndices = setInterval(changeIndices, 5000);
        return;
    }
    clearInterval(updateIndices);
    updateIndices = null;
}
function calculateNewCoinAmount(accuracy, amount){
    amount = parseFloat(amount) || 0;
    return ((accuracy/100) + amount).toFixed(2);
}