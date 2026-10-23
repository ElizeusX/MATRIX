# Infrastructure

The default `docker-compose.yml` can run PostgreSQL, Go API and Next.js locally.

For a hosted deployment, place a TLS reverse proxy / managed edge in front of the web
service, configure a public origin, enable secure cookies, network policy and automated
DB backups. Do **not** publish the PostgreSQL port or API debug interfaces publicly.

A completed production deployment still requires legal documents, authentic content
rights, stock/price verification, payment account activation and comprehensive QA.
