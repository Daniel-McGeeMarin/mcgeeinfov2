"""
All active mappers. To add a new source: create the mapper file, import it here,
and add an instance to MAPPERS.
"""
from ..mapper_abstract import MapperAbstract
from .vanshb03_summer2027 import Vanshb03Summer2027Mapper
from .vanshb03_offseason2027 import Vanshb03Offseason2027Mapper
from .simplifyjobs_summer2027 import SimplifyJobsSummer2027Mapper
from .simplifyjobs_offseason2027 import SimplifyJobsOffseason2027Mapper
from .speedyapply_swe import SpeedyApplySWEMapper
from .speedyapply_ai import SpeedyApplyAIMapper

MAPPERS: list[MapperAbstract] = [
    Vanshb03Summer2027Mapper(),
    Vanshb03Offseason2027Mapper(),
    SimplifyJobsSummer2027Mapper(),
    SimplifyJobsOffseason2027Mapper(),
    SpeedyApplySWEMapper(),
    SpeedyApplyAIMapper(),
]

MAPPER_BY_ID: dict[str, MapperAbstract] = {m.SOURCE_ID: m for m in MAPPERS}
