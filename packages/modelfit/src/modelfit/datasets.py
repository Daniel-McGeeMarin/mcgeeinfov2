import math
import random


def _linspace(start: float, stop: float, n: int) -> list[float]:
    if n == 1:
        return [start]
    step = (stop - start) / (n - 1)
    return [round(start + i * step, 6) for i in range(n)]


def _split(points: list[dict], seed: int, ratio: float = 0.75) -> tuple[list, list]:
    rng = random.Random(seed + 999)
    shuffled = points[:]
    rng.shuffle(shuffled)
    n_train = int(len(shuffled) * ratio)
    return shuffled[:n_train], shuffled[n_train:]


def _y_domain(points: list[dict]) -> list[float]:
    ys = [p["y"] for p in points]
    pad = (max(ys) - min(ys)) * 0.2
    return [round(min(ys) - pad, 2), round(max(ys) + pad, 2)]


_CONFIGS: dict[str, dict] = {
    "car_speed": {
        "id": "car_speed",
        "title": "Highway Drive",
        "description": "A car logs its total distance (km) at various times (min). Model the relationship.",
        "ground_truth": "linear",
        "hint": "The data follows a straight line — try y = a*x + b.",
        "x_min": 1.0, "x_max": 20.0, "n": 35, "seed": 42, "noise": 3.5,
        "fn": lambda x: 1.5 * x + 5.0,
    },
    "cannonball": {
        "id": "cannonball",
        "title": "Cannonball Arc",
        "description": "A cannonball is launched upward. Height (m) is measured over time (s).",
        "ground_truth": "quadratic",
        "hint": "Projectiles trace a parabola — try y = a*x^2 + b*x + c.",
        "x_min": 0.0, "x_max": 4.0, "n": 35, "seed": 7, "noise": 1.5,
        "fn": lambda x: -4.9 * x**2 + 20.0 * x + 5.0,
    },
    "bacteria": {
        "id": "bacteria",
        "title": "Bacteria Colony",
        "description": "Scientists count bacteria (thousands of cells) in a lab culture over several days.",
        "ground_truth": "exponential",
        "hint": "Populations grow exponentially — try y = a*e^(b*x).",
        "x_min": 0.0, "x_max": 6.0, "n": 35, "seed": 13, "noise": 1.8,
        "fn": lambda x: 3.0 * math.exp(0.5 * x),
    },
}


def _generate_points(challenge_id: str) -> list[dict]:
    cfg = _CONFIGS[challenge_id]
    rng = random.Random(cfg["seed"])
    xs = _linspace(cfg["x_min"], cfg["x_max"], cfg["n"])
    return [
        {"x": round(x, 4), "y": round(cfg["fn"](x) + rng.gauss(0, cfg["noise"]), 4)}
        for x in xs
    ]


def list_challenges() -> list[dict]:
    return [
        {
            "id": cfg["id"],
            "title": cfg["title"],
            "description": cfg["description"],
        }
        for cfg in _CONFIGS.values()
    ]


def get_challenge(challenge_id: str) -> dict | None:
    if challenge_id not in _CONFIGS:
        return None
    cfg = _CONFIGS[challenge_id]
    points = _generate_points(challenge_id)
    train, test = _split(points, cfg["seed"])
    return {
        "id": cfg["id"],
        "title": cfg["title"],
        "description": cfg["description"],
        "hint": cfg["hint"],
        "train": sorted(train, key=lambda p: p["x"]),
        "test_x": [p["x"] for p in test],
        "x_domain": [cfg["x_min"], cfg["x_max"]],
        "y_domain": _y_domain(points),
    }


def get_test_actuals(challenge_id: str) -> list[float] | None:
    if challenge_id not in _CONFIGS:
        return None
    cfg = _CONFIGS[challenge_id]
    points = _generate_points(challenge_id)
    _, test = _split(points, cfg["seed"])
    return [p["y"] for p in test]
