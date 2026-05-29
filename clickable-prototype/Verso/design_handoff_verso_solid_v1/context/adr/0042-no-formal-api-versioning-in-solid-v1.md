# No Formal API Versioning in Solid v1

Verso does not use formal API endpoint versioning in Solid v1 because the local frontend and backend evolve together in one repository. Archive Exports are different: exported files may outlive the app version, so Archive Export payloads include explicit schema versioning from the first release.