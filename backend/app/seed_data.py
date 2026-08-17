"""Seed data for Dhaka.

Everything here is a SEED ESTIMATE unless the ``source`` says otherwise
(PLAN.md §3, §12). Coordinates are approximate station/landmark centroids good
enough for distance math; verify before making public claims.

This module is the single source of truth for bootstrapping: ``scripts/seed.py``
loads it into Postgres, and ``repository.py`` falls back to it when the DB is
unreachable so the planner always answers.
"""

from __future__ import annotations

from dataclasses import dataclass, field

# --------------------------------------------------------------------------
# MRT Line 6 — Uttara North -> Motijheel, 16 stations, one operator (DMTCL)
# --------------------------------------------------------------------------

MRT6_TOTAL_KM = 20.1  # published route length; used to scale the chainage


@dataclass(frozen=True)
class SeedStation:
    code: str
    name: str
    name_bn: str
    lat: float
    lng: float
    # Motorcycles can park at MRT-6 stations; cars cannot (PLAN.md §3).
    parkable_modes: tuple[str, ...] = ("bike_own", "bicycle")
    has_car_parking: bool = False


MRT6_STATIONS: list[SeedStation] = [
    SeedStation("UTN", "Uttara North", "উত্তরা উত্তর", 23.8690, 90.3560),
    SeedStation("UTC", "Uttara Center", "উত্তরা সেন্টার", 23.8618, 90.3620),
    SeedStation("UTS", "Uttara South", "উত্তরা দক্ষিণ", 23.8540, 90.3660),
    SeedStation("PLB", "Pallabi", "পল্লবী", 23.8272, 90.3650),
    SeedStation("MP11", "Mirpur 11", "মিরপুর ১১", 23.8215, 90.3660),
    SeedStation("MP10", "Mirpur 10", "মিরপুর ১০", 23.8073, 90.3684),
    SeedStation("KZP", "Kazipara", "কাজীপাড়া", 23.8003, 90.3706),
    SeedStation("SWP", "Shewrapara", "শেওড়াপাড়া", 23.7930, 90.3720),
    SeedStation("AGN", "Agargaon", "আগারগাঁও", 23.7780, 90.3790),
    SeedStation("BJS", "Bijoy Sarani", "বিজয় সরণি", 23.7659, 90.3839),
    SeedStation("FMG", "Farmgate", "ফার্মগেট", 23.7580, 90.3893),
    SeedStation("KWB", "Karwan Bazar", "কারওয়ান বাজার", 23.7510, 90.3925),
    SeedStation("SHB", "Shahbagh", "শাহবাগ", 23.7390, 90.3950),
    SeedStation("DHU", "Dhaka University", "ঢাকা বিশ্ববিদ্যালয়", 23.7330, 90.3960),
    SeedStation("BSC", "Bangladesh Secretariat", "বাংলাদেশ সচিবালয়", 23.7290, 90.4060),
    SeedStation("MTJ", "Motijheel", "মতিঝিল", 23.7280, 90.4180),
]

# MRT-6 runs on headway, not a timetable.
MRT6_HEADWAY_MIN = 8
MRT6_SERVICE_START = "07:00"
MRT6_SERVICE_END = "22:00"
MRT6_AVG_SPEED_KMH = 35.0

# Published DMTCL structure: BDT 5/km, BDT 20 minimum, BDT 100 end-to-end,
# rounded to the nearest 10. Verify the current table (PLAN.md §12).
METRO_RATE_PER_KM = 5.0
METRO_MIN_FARE = 20.0
METRO_MAX_FARE = 100.0


# --------------------------------------------------------------------------
# Landmarks — Phase 0 stand-in for geocoding (PLAN.md §7)
# --------------------------------------------------------------------------


@dataclass(frozen=True)
class SeedLandmark:
    canonical: str
    lat: float
    lng: float
    aliases: tuple[str, ...] = field(default=())


LANDMARKS: list[SeedLandmark] = [
    SeedLandmark("Dhanmondi 27", 23.7538, 90.3760, ("dhanmondi 27", "danmondi 27", "dhanmondi twenty seven")),
    SeedLandmark("Dhanmondi 32", 23.7530, 90.3735, ("dhanmondi 32", "bangabandhu bhaban")),
    SeedLandmark("Kalabagan", 23.7482, 90.3826, ("kalabagan", "kalabagan bus stand")),
    SeedLandmark("New Market", 23.7335, 90.3846, ("new market", "nilkhet")),
    SeedLandmark("Gulshan 1", 23.7806, 90.4152, ("gulshan 1", "gulshan one", "gulshan circle 1")),
    SeedLandmark("Gulshan 2", 23.7925, 90.4147, ("gulshan 2", "gulshan two", "gulshan circle 2")),
    SeedLandmark("Banani", 23.7937, 90.4066, ("banani", "banani 11")),
    SeedLandmark("Mohakhali", 23.7784, 90.4053, ("mohakhali", "mohakhali bus terminal")),
    SeedLandmark("Bashundhara R/A", 23.8213, 90.4265, ("bashundhara", "bashundhara ra", "bashundhara residential area")),
    SeedLandmark("Uttara Sector 7", 23.8700, 90.3990, ("uttara 7", "uttara sector 7")),
    SeedLandmark("Airport (HSIA)", 23.8433, 90.3978, ("airport", "hazrat shahjalal", "hsia", "biman bondor")),
    SeedLandmark("Mirpur 1", 23.7982, 90.3540, ("mirpur 1", "mirpur one")),
    SeedLandmark("Mirpur 10 Golchottor", 23.8069, 90.3687, ("mirpur 10", "mirpur 10 circle", "golchottor")),
    SeedLandmark("Mohammadpur", 23.7650, 90.3590, ("mohammadpur", "mohammadpur bus stand")),
    SeedLandmark("Motijheel", 23.7330, 90.4172, ("motijheel", "motijheel shapla chattar")),
    SeedLandmark("Paltan", 23.7350, 90.4120, ("paltan", "purana paltan")),
    SeedLandmark("Gulistan", 23.7250, 90.4110, ("gulistan", "gulistan bus stand")),
    SeedLandmark("Sadarghat", 23.7080, 90.4120, ("sadarghat", "sadarghat launch terminal")),
    SeedLandmark("Jatrabari", 23.7100, 90.4370, ("jatrabari", "jatrabari chowrasta")),
    SeedLandmark("Rampura", 23.7620, 90.4210, ("rampura", "rampura bridge")),
    SeedLandmark("Badda", 23.7810, 90.4260, ("badda", "middle badda")),
    SeedLandmark("Shyamoli", 23.7740, 90.3670, ("shyamoli", "shyamoli square")),
    SeedLandmark("Kallyanpur", 23.7790, 90.3610, ("kallyanpur", "kalyanpur")),
    SeedLandmark("Agargaon", 23.7780, 90.3790, ("agargaon", "agargaon ict tower")),
    SeedLandmark("Farmgate", 23.7580, 90.3893, ("farmgate", "farm gate")),
    SeedLandmark("Shahbagh", 23.7390, 90.3950, ("shahbagh", "shahbag")),
    SeedLandmark("Tejgaon", 23.7620, 90.3960, ("tejgaon", "tejgaon industrial area")),
    SeedLandmark("Khilgaon", 23.7500, 90.4250, ("khilgaon", "khilgaon taltola")),
    SeedLandmark("Malibagh", 23.7480, 90.4160, ("malibagh", "malibagh mor")),
    SeedLandmark("Savar", 23.8390, 90.2670, ("savar", "savar bus stand")),
]


# --------------------------------------------------------------------------
# Fare rules — official rates and seed estimates, versioned in Postgres
# --------------------------------------------------------------------------


@dataclass(frozen=True)
class SeedFareRule:
    mode: str
    region: str
    base_fare: float
    base_km: float
    rate_per_km: float
    min_fare: float
    source: str
    effective_from: str = "2025-01-01"


FARE_RULES: list[SeedFareRule] = [
    # BRTA gazetted rates — a FLOOR, not what is actually charged (PLAN.md §3).
    SeedFareRule("bus", "dhaka_metro", 0.0, 0.0, 2.56, 10.0, "BRTA gazette (verify notice date)"),
    SeedFareRule("bus", "dtca", 0.0, 0.0, 2.43, 10.0, "BRTA gazette (verify notice date)"),
    SeedFareRule("bus", "inter_district", 0.0, 0.0, 2.23, 8.0, "BRTA gazette (verify notice date)"),
    # Everything below is a seed estimate to be corrected by trip logs.
    SeedFareRule("cng", "dhaka_metro", 40.0, 2.0, 12.0, 60.0, "seed estimate"),
    SeedFareRule("bike_hail", "dhaka_metro", 25.0, 0.0, 11.0, 40.0, "seed estimate"),
    SeedFareRule("car_hail", "dhaka_metro", 60.0, 0.0, 24.0, 100.0, "seed estimate"),
    SeedFareRule("rickshaw", "dhaka_metro", 30.0, 1.0, 22.0, 30.0, "seed estimate"),
    SeedFareRule("bike_own", "dhaka_metro", 0.0, 0.0, 2.85, 0.0, "octane 128 BDT/L @ 45 kmpl (verify)"),
    SeedFareRule("car_own", "dhaka_metro", 0.0, 0.0, 10.70, 0.0, "octane 128 BDT/L @ 12 kmpl (verify)"),
]
