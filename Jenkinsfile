// CI/CD pipeline for the Payment Processing app.
//
// Runs directly on the same EC2 host as the app (agent any), building/testing
// inside throwaway maven/node containers (matching the versions used by
// backend/Dockerfile and frontend/Dockerfile) so the Jenkins host itself only
// needs Docker installed — no separate JDK/Maven/Node toolchain required.
//
// Trigger: Poll SCM (configured below). No image registry is used — the
// deploy stage just runs `docker compose up --build -d` on this same host,
// same as the manual deployment steps used until now.
pipeline {
    agent any

    triggers {
        // Jenkins checks the repo for new commits on this schedule and only
        // starts a build if something changed. H/5 spreads load across the
        // hour instead of every job polling at exactly :00, :05, etc.
        pollSCM('H/5 * * * *')
    }

    options {
        disableConcurrentBuilds()
        timestamps()
        buildDiscarder(logRotator(numToKeepStr: '20'))
    }

    environment {
        // Named volume so the Maven local repo (~/.m2) survives between builds
        // instead of re-downloading every dependency from scratch each time.
        MAVEN_CACHE_VOLUME = 'jenkins_maven_repo'
    }

    stages {
        stage('Backend: Test') {
            steps {
                dir('backend') {
                    sh '''
                        docker run --rm \
                            -v "$PWD":/app -w /app \
                            -v "$MAVEN_CACHE_VOLUME":/root/.m2 \
                            maven:3.9.16-eclipse-temurin-21 \
                            mvn -B test
                    '''
                }
            }
            post {
                always {
                    junit testResults: 'backend/target/surefire-reports/*.xml', allowEmptyResults: true
                }
            }
        }

        stage('Frontend: Test & Build') {
            steps {
                dir('frontend') {
                    sh '''
                        docker run --rm \
                            -v "$PWD":/app -w /app \
                            node:20-alpine \
                            sh -c "npm ci && CI=true npm test -- --watchAll=false --passWithNoTests && npm run build"
                    '''
                }
            }
        }

        stage('Deploy') {
            steps {
                sh '''
                    docker compose down
                    docker compose up --build -d
                    docker compose ps
                '''
            }
        }

        stage('Health check') {
            steps {
                sh '''
                    for i in $(seq 1 10); do
                        if curl -fs http://localhost:8081/ > /dev/null; then
                            echo "Frontend is up."
                            exit 0
                        fi
                        echo "Waiting for frontend to become reachable... ($i/10)"
                        sleep 3
                    done
                    echo "Frontend did not become reachable in time."
                    docker compose logs --tail=100
                    exit 1
                '''
            }
        }
    }

    post {
        success {
            echo 'Pipeline succeeded: app built, tested and deployed.'
        }
        failure {
            echo 'Pipeline failed — see the failing stage log above for details.'
        }
    }
}
