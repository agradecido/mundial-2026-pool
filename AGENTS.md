# Documento de Especificaciones: Desarrollo de Software - Quiniela Mundial 2026

## 1. Contexto del Proyecto
El objetivo es desarrollar una plataforma web/móvil para gestionar una quiniela (porra/prode) de amigos para el Mundial de Fútbol 2026. Al ser el mundial más grande de la historia, contará con **48 selecciones y 104 partidos** (incluyendo la nueva ronda de dieciseisavos de final). 

El sistema debe ser escalable, automatizado en el cálculo de puntos y contar con reglas estrictas para evitar disputas entre los usuarios.

---

## 2. Reglas del Negocio y Lógica del Juego

### 2.1. Definición de Resultado Oficial
* El resultado válido para el software es el marcador al finalizar el tiempo oficial de juego. Esto incluye los **90 minutos reglamentarios + el tiempo extra (prórroga)** si lo hubiera.
* **Exclusión:** Las tandas de penales de desempate final **NO** se contabilizan en el marcador del partido para la quiniela.

### 2.2. Restricción de Tiempo (Bloqueo de Pronósticos)
* El sistema debe bloquear la posibilidad de crear o modificar el pronóstico de un partido exactamente **15 minutos antes** de la hora oficial programada para el pitazo inicial (`fecha_partido`).

### 2.3. Sistema de Puntuación (No Acumulable por Partido)
Por cada partido individual, el usuario recibe el puntaje máximo que le corresponda según el siguiente orden jerárquico:
1. **Marcador Exacto:** 5 puntos (Si el usuario predice exactamente los goles de ambos equipos).
2. **Tendencia (Ganador/Empate):** 3 puntos (Si el usuario acierta el ganador o el empate, pero no los goles exactos).
3. **Consolación por Goles:** 1 punto (Si el usuario no acierta la tendencia, pero adivina la cantidad exacta de goles que anotó uno de los dos equipos).
4. **Fallo Total:** 0 puntos.

### 2.4. Multiplicadores y Predicciones a Largo Plazo
* **Fase de Eliminación Directa:** A partir de los dieciseisavos de final (Ronda de 32), los puntos por partido se duplican (Marcador exacto = 10 pts, Tendencia = 6 pts).
* **Predicciones Especiales (Bloqueadas en el Día 1 del torneo):**
  * Campeón del Mundo: 20 puntos.
  * Subcampeón del Mundo: 15 puntos.
  * Bota de Oro (Máximo goleador): 15 puntos.

### 2.5. Criterios de Desempate en el Ranking
Si dos o más usuarios empatan en puntos totales, el orden en la tabla de posiciones se define por:
1. Mayor número de Marcadores Exactos (5 o 10 puntos) acertados.
2. Mayor número de Tendencias (3 o 6 puntos) acertadas.
3. Fecha de registro en la plataforma (Premio al usuario más antiguo).

---

## 3. Arquitectura de Datos Sugerida (Relacional)

El agente de IA debe basarse en esta estructura de entidades para diseñar la base de datos:

```sql
-- Tabla de Usuarios
CREATE TABLE usuarios (
    id_usuario INT PRIMARY KEY,
    nombre VARCHAR(100),
    email VARCHAR(100) UNIQUE,
    password_hash VARCHAR(255),
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de Partidos
CREATE TABLE partidos (
    id_partido INT PRIMARY KEY,
    equipo_local VARCHAR(50),
    equipo_visitante VARCHAR(50),
    fecha_partido TIMESTAMP,
    fase VARCHAR(50), -- 'Grupos', 'Dieciseisavos', 'Octavos', etc.
    goles_local_real INT NULL,
    goles_visitante_real INT NULL,
    estado VARCHAR(20) -- 'Programado', 'En Progreso', 'Finalizado'
);

-- Tabla de Pronósticos de los Usuarios
CREATE TABLE pronosticos (
    id_pronostico INT PRIMARY KEY,
    id_usuario INT FOREIGN KEY REFERENCES usuarios(id_usuario),
    id_partido INT FOREIGN KEY REFERENCES partidos(id_partido),
    goles_local_pronostico INT,
    goles_visitante_pronostico INT,
    puntos_ganados INT DEFAULT 0,
    fecha_guardado TIMESTAMP,
    UNIQUE(id_usuario, id_partido)
);

-- Tabla de Predicciones a Largo Plazo
CREATE TABLE predicciones_futuras (
    id_usuario INT PRIMARY KEY FOREIGN KEY REFERENCES usuarios(id_usuario),
    campeon_pronostico VARCHAR(50),
    subcampeon_pronostico VARCHAR(50),
    bota_oro_pronostico VARCHAR(100),
    puntos_campeon INT DEFAULT 0,
    puntos_subcampeon INT DEFAULT 0,
    puntos_bota INT DEFAULT 0
);
```

## 4. Tareas Requeridas para la IA
Actúa como un Ingeniero de Software Fullstack Senior y un Arquitecto de Soluciones. Con base en este documento, realiza las siguientes tareas:

1. Diseño de Arquitectura: Propón el stack tecnológico ideal (Frontend, Backend y Base de Datos) considerando que debe ser un desarrollo rápido, económico y fácil de desplegar para un grupo de amigos.

2. Lógica del Backend: Escribe el pseudocódigo, función o script (preferiblemente en Node.js, Python o la tecnología recomendada) que se ejecute cuando el administrador ingresa el resultado real de un partido, el cual debe calcular y actualizar los puntos de todos los usuarios de forma masiva y eficiente.

3. Validación de Seguridad: Diseña el algoritmo o endpoint de validación que verifique que ningún usuario pueda enviar o modificar un pronóstico si faltan menos de 15 minutos para el partido.
