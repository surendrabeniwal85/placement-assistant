FROM eclipse-temurin:25-jdk AS build

WORKDIR /workspace

COPY mvnw pom.xml ./
COPY .mvn/ .mvn/

RUN sed -i 's/\r$//' mvnw \
    && chmod +x mvnw

COPY src/main/java/ src/main/java/
COPY src/main/resources/db/ src/main/resources/db/
COPY src/main/resources/application.yml src/main/resources/application.yml

RUN ./mvnw -B -DskipTests package

FROM eclipse-temurin:25-jre AS runtime

WORKDIR /app

EXPOSE 8080

COPY --from=build --chown=10001:0 \
    /workspace/target/placement-assistant-api-0.0.1-SNAPSHOT.jar \
    /app/app.jar

USER 10001:0

ENTRYPOINT ["java", "-jar", "/app/app.jar"]