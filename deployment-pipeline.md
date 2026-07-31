# TDTUOJ Deployment Pipeline

![Deployment Pipeline](C:\Users\Admin\.gemini\antigravity\brain\deac7167-dccc-4438-ae22-194ffbba0cdc\deployment_pipeline_drawio_1784550425027.png)

```mermaid
flowchart TD
    DEV["Developer\nLocal Machine"]

    subgraph REPO["GitHub Repository"]
        MAIN["main branch"]
        GHA["GitHub Actions\ndeploy.yml"]
    end

    subgraph CI["CI — Build Gate\nubuntu-latest runner"]
        JDK["JDK 21\nTemurin"]
        MVN["Maven\nclean package\n+ unit tests"]
    end

    subgraph FRONTEND["Frontend Deploy\nVercel"]
        VITE["React + Vite\nbuild"]
        CDN["Vercel CDN\n(auto HTTPS)"]
    end

    subgraph VM["Azure VM — x86_64"]
        GIT["git pull"]

        subgraph PROXY["Reverse Proxy"]
            CADDY["Caddy 2\nauto HTTPS · Let's Encrypt"]
        end

        subgraph APP["Application Stack"]
            SPRING["Spring Boot\n:8090"]
            PG["PostgreSQL 16\n(app-db)"]
            REDIS["Redis 7\n(app-redis)"]
        end

        subgraph JUDGE["Judge0 CE Stack (x86_64)"]
            J0SRV["Judge0 Server\n:2358"]
            J0WRK["Judge0 Workers"]
            J0DB["PostgreSQL 16\n(judge0-db)"]
            J0RED["Redis 7\n(judge0-redis)"]
        end

        subgraph OBS["Observability Stack"]
            PROM["Prometheus\n:9090"]
            GRAF["Grafana\n:3000"]
        end
    end

    BROWSER["Browser / Client"]

    %% Push triggers CI
    DEV -->|"git push"| MAIN
    MAIN -->|"on: push paths: backend, deploy"| GHA
    GHA --> CI
    JDK --> MVN

    %% CD after build gate
    MVN -->|"build passes"| SSH["SSH\n(appleboy/ssh-action)"]
    SSH -->|"cd ~/TDTUOJ"| GIT
    GIT -->|"docker compose up -d --build"| APP
    GIT -->|"docker compose up -d --build"| JUDGE
    GIT -->|"docker compose up -d"| PROXY

    %% Frontend auto-deploys on Vercel
    MAIN -->|"push to main (all paths)"| VITE
    VITE --> CDN

    %% Runtime traffic
    BROWSER -->|"HTTPS :443"| CDN
    BROWSER -->|"HTTPS :443 /api"| CADDY
    CADDY -->|"HTTP :8090"| SPRING
    SPRING -->|"JDBC"| PG
    SPRING -->|"TCP :6379"| REDIS
    SPRING -->|"HTTP :2358"| J0SRV
    J0SRV --> J0WRK
    J0WRK --> J0DB
    J0WRK --> J0RED

    %% Observability
    PROM -->|"scrape /actuator/prometheus"| SPRING
    GRAF -->|"query"| PROM
```

## Notes

| Layer | Technology | Hosted on |
|---|---|---|
| Source control & CI/CD | GitHub Actions | GitHub |
| Frontend | React + Vite | Vercel (auto-deploy on push) |
| Reverse proxy | Caddy 2 (auto TLS) | Azure VM |
| Backend | Spring Boot 3 / Java 21 | Azure VM (Docker) |
| App database | PostgreSQL 16 | Azure VM (Docker) |
| Cache / rate-limiting | Redis 7 | Azure VM (Docker) |
| Code execution | Judge0 CE 1.13.1 | Azure VM (Docker, x86_64 only) |
| Judge queue/store | PostgreSQL 16 + Redis 7 | Azure VM (Docker) |
| Metrics collection | Prometheus | Azure VM (Docker) |
| Dashboards | Grafana | Azure VM (Docker) |
