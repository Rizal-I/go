1. Source Boilerplate
   - a. NODE boilerplate: [hackathon-starter](https://github.com/sahat/hackathon-starter)
   - b. GO boilerplate: [go-boilerplate](https://github.com/syahidfrd/go-boilerplate)

3. CI/CD
   - a. Build and test (optional) the services:
     -  For Go Service, Create folder and file on this repo
          ```
          .github/workflows/ci-go-boilerplate.yml
          ``` 
     -  For Node Service, Create folder and file on this repo
          ```
          .github/workflows/ci-node-boilerplate.yml
          ``` 
     - Inside ci-go-boilerplate.yml write for Build and Test on specific path when there is a change on it
       ```yaml
        name: Golang Build, Test, Push to Docker Hub, and Deploy to K8S
        
        on:
          push:
            paths:
              - 'go-boilerplate/**'
        
        defaults:
          run:
            working-directory: go-boilerplate
        
        jobs:
          build-and-test:
            runs-on: ubuntu-latest
            env:
              MIGRATION_NAME: test
        
            steps:
              - name: Checkout code
                uses: actions/checkout@v2
        
              - name: Set up Go
                uses: actions/setup-go@v2
                with:
                  go-version: 1.x
        
              - name: Set up PostgreSQL
                run: |
                  docker run -d -p 5432:5432 -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=go_boilerplate postgres
        
              - name: Set up Redis
                run: docker run -d -p 6379:6379 redis
        
              - name: Install migrate CLI
                run: go install -tags 'postgres' github.com/golang-migrate/migrate/v4/cmd/migrate@latest
        
              - name: Set up .env file
                run: |
                  if [ -f ./.env ]; then
                    cp .env .env.github
                  fi
              
              - name: Install mockery
                run: go install github.com/vektra/mockery/v2@latest
        
              - name: Migration Create
                run: migrate -path migration -database "postgres://postgres:postgres@localhost/go_boilerplate?sslmode=disable" create -ext sql -dir migration -seq ${{ env.MIGRATION_NAME }}
        
              - name: Migration Up
                run: migrate -path migration -database "postgres://postgres:postgres@localhost/go_boilerplate?sslmode=disable" up
        
              - name: Automatic Migration Down
                run: |
                  echo "y" | migrate -path migration -database "postgres://postgres:postgres@localhost/go_boilerplate?sslmode=disable" down
        
        
              - name: Run Tests
                run: go test -v ./...
        
              - name: Generate Mocks
                run: mockery --all
       ```
   - b. Building the container image
     - for Go Service, add more jobs on ci-go-boilerplate.yml below
       ```yaml
       build-push-go:
         needs: build-and-test
         runs-on: ubuntu-latest
      
         steps:
           - name: Checkout code
             uses: actions/checkout@v2
      
           - name: Set up Docker Buildx
             uses: docker/setup-buildx-action@v1
      
           - name: Log in to Docker Hub
             uses: docker/login-action@v1
             with:
               username: ${{ secrets.DOCKER_HUB_USERNAME }}
               password: ${{ secrets.DOCKER_HUB_ACCESS_TOKEN }}
         ```
   - c. Store container image to a registry
     - for Go service add more steps in ci-go-boilerplate.yml after buidling the image
       ```yaml             
           - name: Build and Push Docker Image
             uses: docker/build-push-action@v2
             with:
               context: go-boilerplate
               push: true
               tags: ${{ secrets.DOCKER_HUB_USERNAME }}/go-boilerplate:${{ github.run_number }}
       ```
   - d. Deploy to Kubernetes cluster
      - for Go service add more jobs for inside ci-go-boilerplate.yml
        ```yaml
        deploy-K8S-go:
          needs: build-push-go
          runs-on: ubuntu-latest
          env:
            PROJECT_ID: ${{ secrets.GKE_PROJECT }}
            GKE_CLUSTER: apache-flink-cluster-1
            GKE_ZONE: us-central1-c
      
          steps:
          - name: Checkout
            uses: actions/checkout@v3
      
          # Configure SA.
          - id: 'auth'
            uses: 'google-github-actions/auth@v0'
            with:
              credentials_json: '${{ secrets.GKE_SA_KEY }}'
      
          # Get the k8s credentials so we can deploy to the cluster
          - name: Set up k8s credentials
            uses: google-github-actions/get-gke-credentials@v0
            with:
              cluster_name: ${{ env.GKE_CLUSTER }}
              location: ${{ env.GKE_ZONE }}
      
          - name: Deploy Go App to k8s
            run: |
              sed -i "s/TAG/${{ github.run_number }}/g" k8s/go-deployment.yaml
              kubectl apply -f k8s/
        ```
   - both two CI/CD yml file will look like this
      - ci-go-boilerplate.yml
        ```yaml
         name: Golang Build, Test, Push to Docker Hub, and Deploy to K8S
         on:
           push:
             paths:
               - 'go-boilerplate/**'
         
         defaults:
           run:
             working-directory: go-boilerplate
         
         jobs:
           build-and-test:
             runs-on: ubuntu-latest
             env:
               MIGRATION_NAME: test
         
             steps:
               - name: Checkout code
                 uses: actions/checkout@v2
         
               - name: Set up Go
                 uses: actions/setup-go@v2
                 with:
                   go-version: 1.x
         
               - name: Set up PostgreSQL
                 run: |
                   docker run -d -p 5432:5432 -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=go_boilerplate postgres
         
               - name: Set up Redis
                 run: docker run -d -p 6379:6379 redis
         
               - name: Install migrate CLI
                 run: go install -tags 'postgres' github.com/golang-migrate/migrate/v4/cmd/migrate@latest
         
               - name: Set up .env file
                 run: |
                   if [ -f ./.env ]; then
                     cp .env .env.github
                   fi
               
               - name: Install mockery
                 run: go install github.com/vektra/mockery/v2@latest
         
               - name: Migration Create
                 run: migrate -path migration -database "postgres://postgres:${{ secrets.POSTGRES_PASSWORD }}@localhost/go_boilerplate?sslmode=disable" create -ext sql -dir migration -seq ${{ env.MIGRATION_NAME }}
         
               - name: Migration Up
                 run: migrate -path migration -database "postgres://postgres:${{ secrets.POSTGRES_PASSWORD }}@localhost/go_boilerplate?sslmode=disable" up
         
               - name: Automatic Migration Down
                 run: |
                   echo "y" | migrate -path migration -database "postgres://postgres:${{ secrets.POSTGRES_PASSWORD }}@localhost/go_boilerplate?sslmode=disable" down
         
         
               - name: Run Tests
                 run: go test -v ./...
         
               - name: Generate Mocks
                 run: mockery --all
         
           build-push-go:
             needs: build-and-test
             runs-on: ubuntu-latest
         
             steps:
               - name: Checkout code
                 uses: actions/checkout@v2
         
               - name: Set up Docker Buildx
                 uses: docker/setup-buildx-action@v1
         
               - name: Log in to Docker Hub
                 uses: docker/login-action@v1
                 with:
                   username: ${{ secrets.DOCKER_HUB_USERNAME }}
                   password: ${{ secrets.DOCKER_HUB_ACCESS_TOKEN }}
         
               - name: Build and Push Docker Image
                 uses: docker/build-push-action@v2
                 with:
                   context: go-boilerplate
                   push: true
                   tags: ${{ secrets.DOCKER_HUB_USERNAME }}/go-boilerplate:${{ github.run_number }}
         
           deploy-K8S-go:
             needs: build-push-go
             runs-on: ubuntu-latest
             env:
               PROJECT_ID: ${{ secrets.GKE_PROJECT }}
               GKE_CLUSTER: apache-flink-cluster-1
               GKE_ZONE: us-central1-c
         
             steps:
             - name: Checkout
               uses: actions/checkout@v3
         
             # Configure SA.
             - id: 'auth'
               uses: 'google-github-actions/auth@v0'
               with:
                 credentials_json: '${{ secrets.GKE_SA_KEY }}'
         
             # Get the k8s credentials so we can deploy to the cluster
             - name: Set up k8s credentials
               uses: google-github-actions/get-gke-credentials@v0
               with:
                 cluster_name: ${{ env.GKE_CLUSTER }}
                 location: ${{ env.GKE_ZONE }}
         
             - name: Deploy Go App to k8s
               run: |
                 sed -i "s/TAG/${{ github.run_number }}/g" k8s/go-deployment.yaml
                 kubectl apply -f k8s/
        ```
      - node-go-boilerplate.yml
        ```yaml
         name: Node Build, Test, Push to Docker Hub, and Deploy to K8S
         
         on:
           push:
             paths:
               - 'hackathon-starter/**'
         
         defaults:
           run:
             working-directory: hackathon-starter
         
         jobs:
           build-and-push:
             runs-on: ubuntu-latest
         
             steps:
               - name: Checkout code
                 uses: actions/checkout@v2
         
               - name: Set up Docker Buildx
                 uses: docker/setup-buildx-action@v1
         
               - name: Log in to Docker Hub
                 uses: docker/login-action@v1
                 with:
                   username: ${{ secrets.DOCKER_HUB_USERNAME }}
                   password: ${{ secrets.DOCKER_HUB_ACCESS_TOKEN }}
         
               - name: Build and Push Docker Image
                 uses: docker/build-push-action@v2
                 with:
                   context: hackathon-starter
                   push: true
                   tags: ${{ secrets.DOCKER_HUB_USERNAME }}/node-boilerplate:${{ github.run_number }}
         
           deploy-K8S-node:
             needs: build-and-push
             runs-on: ubuntu-latest
             env:
               PROJECT_ID: ${{ secrets.GKE_PROJECT }}
               GKE_CLUSTER: apache-flink-cluster-1
               GKE_ZONE: us-central1-c
         
             steps:
             - name: Checkout
               uses: actions/checkout@v3
         
             # Configure SA.
             - id: 'auth'
               uses: 'google-github-actions/auth@v0'
               with:
                 credentials_json: '${{ secrets.GKE_SA_KEY }}'
         
             # Get the k8s credentials so we can deploy to the cluster
             - name: Set up k8s credentials
               uses: google-github-actions/get-gke-credentials@v0
               with:
                 cluster_name: ${{ env.GKE_CLUSTER }}
                 location: ${{ env.GKE_ZONE }}
         
             - name: Deploy node App to k8s
               run: |
                 sed -i "s/TAG/${{ github.run_number }}/g" k8s/node-deployment.yaml
                 kubectl apply -f k8s/
        ```
5. Service
   - a. [Go Service API Documentation](https://golang.35.202.193.211.nip.io/swagger/index.html)
   - b. [Node.js Service API](https://node.35.202.193.211.nip.io/api)
     - If not accessible, the service has already been scaled down. Please reach out to me to scale up the service.

6. Stack
   - a. GitHub Actions for CI/CD
   - b. nip.io for DNS
   - c. Istio for service management
   - d. cert-manager for enabling HTTPS
   - e. GKE (Google Kubernetes Engine) for container management
   - f. DockerHub for storing Docker images

