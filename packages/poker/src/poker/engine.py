import numpy as np
import random
import collections

class Deck:
    def __init__(self):
        self.cards = []
        self.pos = 0
        suit = {"Hearts", "Clubs", "Diamonds", "Spades"}
        for x in range(13):
            for y in suit:
                self.cards.append((x+2, y))
        self.shuffle()

    def remove(self, toBeRemoved):
        for x in toBeRemoved:
            self.cards.remove(x)

    def shuffle(self):
        random.shuffle(self.cards)
        self.pos = 0

    def draw(self):

        if self.pos > 51:
            return "empty deck"

        card = self.cards[self.pos]
        self.pos += 1
        return card



def determineHand(cardArray):

    suitDict = collections.defaultdict(int)
    rankDict = collections.defaultdict(int)

    for card in cardArray:
        suitDict[card[1]] += 1
        rankDict[card[0]] += 1

    rankOrder = list(reversed(sorted(rankDict.keys())))

    revRankDic = collections.defaultdict(list)
    for key in rankDict:
        revRankDic[rankDict[key]].append(key)


    #print("+++++++++++Board++++++++++++++")

    #for x in Board:
    #    print(x)

    #print("+++++++++++DICTS++++++++++++++")
    #print("suitDict", suitDict)
    #print("rankDict", rankDict)
    #print("revRank", revRankDic)
    #print("rankOrder", rankOrder)
    #print("+++++++++++DICTS++++++++++++++")

    def getKickers(exclusionList, count):
        return [card for card in rankOrder if card not in exclusionList][:count]


    def checkPairsPlus():
        if 4 in revRankDic:
            return [8, revRankDic[4]]

        if 3 in revRankDic:
            if len(revRankDic[3]) > 2:
                return [7, max(revRankDic[3]), min(revRankDic[3])]
            if 2 in revRankDic:
                return [7, max(revRankDic[3]), max(revRankDic[2])]

            return [4, max(revRankDic[3])] + getKickers([max(revRankDic[3])], 2)

        if 2 in revRankDic and len(revRankDic[2]) >= 2:
            larg, sec = sorted(revRankDic[2], reverse = True)[:2]
            return [3, larg, sec] + getKickers([larg, sec], 1)

        if 2 in revRankDic:
            return [2, revRankDic[2][0]] + getKickers([revRankDic[2][0]], 3)

        return [1] + getKickers([], 5)


    def checkStraight():
        maxStreak = 0
        streak = 0
        topCard = 0

        if 14 in rankDict:
            streak = 1
            maxStreak = 1

        for x in range(2,14):
            if x in rankDict:
                streak += 1
                if streak > maxStreak:
                    maxStreak = streak
                    topCard = x
            else:
                streak = 0

        if streak >= 5:
            return [5, topCard]
        return False


    def checkFlush():
        for suit in suitDict:
            if suitDict[suit] >= 5:
                return [6] + list(reversed(sorted([t[0] for t in cardArray if t[1] == suit])))
        return False



    flushVar = checkFlush()
    straightVar = checkStraight()
    pairPlusVar = checkPairsPlus()

    if flushVar and straightVar:
        return [9, straightVar[1]]

    if pairPlusVar[0]>6:
        return pairPlusVar

    if flushVar:
        return flushVar

    if straightVar:
        return straightVar

    return pairPlusVar


class GameEngine:
    def __init__(self, HandArray, Board):
        #leave handArray entries as False to draw them
        self.deck = Deck()

        self.Board = Board
        self.handArray = HandArray


        toBeRemoved = Board + [card1[0] for card1 in HandArray if card1] + [card2[1] for card2 in HandArray if card2]

        if len(toBeRemoved) != len(set(toBeRemoved)):
            raise ValueError("cannot have duplicate cards removed")

        self.deck.remove(toBeRemoved)

    def runGame(self):
        self.deck.shuffle()

        gameBoardTemp = self.Board.copy()
        handArrayTemp = self.handArray.copy()


        while len(gameBoardTemp) < 5:
            gameBoardTemp.append(self.deck.draw())

        for i, cards in enumerate(handArrayTemp):
            if cards == False:
                handArrayTemp[i] = [self.deck.draw(), self.deck.draw()]

        strengthArray = []

        for hand in handArrayTemp:
            boardhand = gameBoardTemp + hand
            strengthArray.append(determineHand(boardhand))

        Winner = max(range(len(strengthArray)), key = lambda x: strengthArray[x])

        return Winner




def MonteCarloSim():
    Board = [(13, 'Diamonds'), (9, 'Hearts'), (9, 'Diamonds')]
    PlayerArray = [[(14, "Hearts"), (9, 'Spades')], False, False, False]
    TRIALS = 10000

    newGame = GameEngine(PlayerArray, Board)
    winArray = np.array([0]*len(PlayerArray))
    for _ in range(TRIALS):
        winArray[newGame.runGame()] += 1

    WinPerc = winArray/TRIALS


    return WinPerc


if __name__ == "__main__":
    print(MonteCarloSim())
