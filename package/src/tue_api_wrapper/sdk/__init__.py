from .authenticated import TuebingenAuthenticatedClient
from .credentials import UniversityCredentials
from .discovery import CourseDiscoveryApi
from .public import TuebingenPublicClient

__all__ = [
    "CourseDiscoveryApi",
    "TuebingenAuthenticatedClient",
    "TuebingenPublicClient",
    "UniversityCredentials",
]
