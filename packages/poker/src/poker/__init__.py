from .engine import Deck, GameEngine, determineHand, MonteCarloSim

_RANKS = {r: i for i, r in enumerate("23456789TJQKA", start=2)}
_SUITS = {"s": "Spades", "h": "Hearts", "d": "Diamonds", "c": "Clubs"}


def parse_card(card: str) -> tuple[int, str]:
    """Convert shorthand notation ("As", "Td", "9h") to this engine's (rank, suit) tuples."""
    rank_char, suit_char = card[0].upper(), card[1].lower()
    if rank_char not in _RANKS or suit_char not in _SUITS:
        raise ValueError(f"invalid card: {card!r}")
    return (_RANKS[rank_char], _SUITS[suit_char])


def simulate_equity(
    hero: list[str],
    board: list[str],
    num_opponents: int,
    trials: int = 4000,
) -> list[float]:
    """Win probability for `hero` against `num_opponents` random hands, given `board`.

    Thin parameterized wrapper around the untouched GameEngine/Deck/determineHand
    logic in engine.py — same Monte Carlo loop as MonteCarloSim(), just with the
    hand/board/trial count taken as arguments instead of hardcoded.
    """
    hero_cards = [parse_card(c) for c in hero]
    board_cards = [parse_card(c) for c in board]
    player_array = [hero_cards] + [False] * num_opponents

    game = GameEngine(player_array, board_cards)
    win_counts = [0] * len(player_array)
    for _ in range(trials):
        win_counts[game.runGame()] += 1

    return [count / trials for count in win_counts]
