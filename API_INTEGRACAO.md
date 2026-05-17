# 🔬 Unbrella API — Guia de Integração Frontend

**Base URL:** `http://localhost:5055`  
**Formato de resposta:** JSON (dados) ou PNG (imagens)  
**CORS:** habilitado para todas as origens (`*`)

> ⚠️ **Importante sobre os dados:** Esta é uma demonstração com dataset simulado. Todos os 5 pacientes (`P001`–`P005`) utilizam o **mesmo conjunto de imagens reais** (`processed_images/`). Os dados são idênticos entre pacientes — isso é intencional para fins de prototipação.

---

## 📋 Índice

1. [Pacientes](#pacientes)
2. [Resumo do Antibiograma](#resumo-do-antibiograma)
3. [Imagens Gerais](#imagens-gerais)
4. [Endpoints por Disco](#endpoints-por-disco)
5. [Estrutura dos Dados JSON](#estrutura-dos-dados-json)
6. [Exemplos de Integração](#exemplos-de-integração)

---

## Pacientes

### `GET /pacientes`

Retorna a lista de todos os pacientes simulados.

**Resposta:**
```json
[
  {
    "id": "P001",
    "nome": "Ana Beatriz Silva",
    "idade": 34,
    "medico": "Dr. Carlos Matos"
  },
  {
    "id": "P002",
    "nome": "João Pedro Alves",
    "idade": 52,
    "medico": "Dra. Fernanda Lima"
  },
  {
    "id": "P003",
    "nome": "Maria José Santos",
    "idade": 28,
    "medico": "Dr. Roberto Souza"
  },
  {
    "id": "P004",
    "nome": "Carlos Eduardo Neto",
    "idade": 61,
    "medico": "Dra. Patricia Rocha"
  },
  {
    "id": "P005",
    "nome": "Luísa Fernanda Costa",
    "idade": 45,
    "medico": "Dr. André Pereira"
  }
]
```

---

### `GET /`

Retorna informações gerais da API (útil para health check e descoberta).

```json
{
  "api": "Unbrella Antibiograma",
  "total_pacientes": 5,
  "total_discos": 18,
  "total_imagens": 948,
  "endpoints": { ... }
}
```

---

## Resumo do Antibiograma

### `GET /paciente/{pid}/resumo`

Retorna os dados do antibiograma completo do paciente — **18 discos** com medições em milímetros.

**Parâmetros:**
| Parâmetro | Tipo | Exemplo |
|---|---|---|
| `pid` | string | `P001`, `P002`, ..., `P005` |

**Resposta:**
```json
{
  "paciente_id": "P001",
  "nome": "Ana Beatriz Silva",
  "idade": 34,
  "medico": "Dr. Carlos Matos",
  "total_frames": 948,
  "total_discos": 18,
  "calibracao": "400px = 140mm (0.35 mm/px)",
  "discos": [
    {
      "disco_id": 1,
      "centro_px": [228, 412],
      "angulo_deg": 169.0,
      "disco_preto_mm": 3.15,
      "halo_fim_mm": 10.85,
      "halo_largura_mm": 7.7,
      "n_frames": 948
    },
    ...
  ]
}
```

**Campos importantes:**
| Campo | Descrição |
|---|---|
| `disco_preto_mm` | Raio do disco de antibiótico em mm |
| `halo_fim_mm` | Distância do centro até o fim do halo em mm |
| `halo_largura_mm` | Largura do halo de inibição (`halo_fim - disco_preto`) |
| `n_frames` | Número de fotos analisadas ao longo do tempo |

---

## Imagens Gerais

Todos os endpoints de imagem retornam **`image/png`** diretamente. Para exibir no frontend, use a URL como `src` de uma tag `<img>` ou faça fetch com `blob()`.

### `GET /paciente/{pid}/imagem/geral`

Foto da placa completa com todos os 18 discos anotados (centros, halos, direções).

### `GET /paciente/{pid}/imagem/grid`

Grid com crop de cada disco individualmente (18 quadros lado a lado).

### `GET /paciente/{pid}/imagem/barras`

Gráfico de barras comparando o halo de inibição (mm) de todos os 18 discos.

### `GET /paciente/{pid}/imagem/evolucao_todos`

Evolução temporal do halo de todos os 18 discos no mesmo gráfico (ao longo dos 948 frames).

**Como usar no HTML:**
```html
<img src="http://localhost:5055/paciente/P001/imagem/geral" alt="Visão Geral" />
<img src="http://localhost:5055/paciente/P001/imagem/barras" alt="Comparativo" />
```

**Como usar com fetch (React/Vue/etc):**
```js
const response = await fetch(`http://localhost:5055/paciente/${pid}/imagem/geral`);
const blob = await response.blob();
const url = URL.createObjectURL(blob);
// use `url` no src da imagem
```

---

## Endpoints por Disco

Os discos são numerados de `1` a `18`.

### `GET /paciente/{pid}/disco/{did}/analise`

Retorna um PNG com **4 painéis** de análise do disco:
- Crop da imagem com marcações
- Perfil de intensidade radial
- Perfil linear na direção do halo
- Gradiente do perfil

**Exemplo:** `GET /paciente/P001/disco/3/analise`

---

### `GET /paciente/{pid}/disco/{did}/evolucao`

Retorna um PNG com a **evolução temporal** do disco ao longo dos 948 frames:
- Raio do disco preto (mm)
- Fim do halo (mm)
- Largura do halo (mm)

---

### `GET /paciente/{pid}/disco/{did}/dados`

Retorna o JSON completo com a série temporal do disco, frame a frame.

**Resposta:**
```json
{
  "paciente_id": "P001",
  "disco_id": 1,
  "centro_px": [228, 412],
  "angulo_deg": 169.02,
  "disco_preto_mm": 3.15,
  "halo_fim_mm": 10.85,
  "halo_largura_mm": 7.7,
  "calibracao_mm_px": 0.35,
  "serie_temporal": [
    {
      "frame": 0,
      "file": "foto_2025-10-17_17-59-17_500x500.bmp",
      "timestamp": "2025-10-17T17:59:17",
      "black_r_px": 9.0,
      "halo_end_px": 54.0,
      "halo_w_px": 45.0,
      "black_r_mm": 3.15,
      "halo_end_mm": 18.9,
      "halo_w_mm": 15.75
    },
    {
      "frame": 1,
      "file": "foto_2025-10-17_18-00-23_500x500.bmp",
      "timestamp": "2025-10-17T18:00:23",
      "black_r_px": 9.0,
      "halo_end_px": 53.0,
      "halo_w_px": 44.0,
      "black_r_mm": 3.15,
      "halo_end_mm": 18.55,
      "halo_w_mm": 15.4
    }
    ...
  ]
}
```

**Campos da série temporal:**
| Campo | Descrição |
|---|---|
| `frame` | Índice do frame (0 a 947) |
| `timestamp` | Data/hora da foto (ISO 8601) |
| `black_r_mm` | Raio do disco preto em mm |
| `halo_end_mm` | Fim do halo a partir do centro em mm |
| `halo_w_mm` | Largura do halo de inibição em mm |

---

## Estrutura dos Dados JSON

### Calibração

```
400 px = 140 mm  →  1 px = 0.35 mm
```

O dataset usa imagens `500×500 px` representando a placa de Petri de 140 mm de diâmetro.

### Timestamps

As fotos foram tiradas de **17/10/2025 às 17:59** até o último frame. O timestamp está no nome do arquivo e é extraído automaticamente pela API.

### Discos com menor halo (possível resistência)

Com base na última medição:

| Disco | Halo Largura |
|---|---|
| 13 | 3.85 mm |
| 17 | 3.85 mm |
| 14 | 6.30 mm |
| 16 | 6.30 mm |

Discos com halo < 7 mm podem indicar resistência ao antibiótico — validar com o médico.

---

## Exemplos de Integração

### Fetch simples (JavaScript)

```js
// Listar pacientes
const pacientes = await fetch('http://localhost:5055/pacientes').then(r => r.json());

// Resumo do antibiograma
const resumo = await fetch('http://localhost:5055/paciente/P001/resumo').then(r => r.json());

// Exibir imagem geral
document.getElementById('img-geral').src = 'http://localhost:5055/paciente/P001/imagem/geral';

// Série temporal do disco 3
const dados = await fetch('http://localhost:5055/paciente/P001/disco/3/dados').then(r => r.json());
const serie = dados.serie_temporal; // array com 948 pontos
```

### React — componente de imagem

```jsx
function DiskImage({ pid, did, tipo }) {
  // tipo: "analise" | "evolucao"
  const url = `http://localhost:5055/paciente/${pid}/disco/${did}/${tipo}`;
  return <img src={url} alt={`Disco ${did} - ${tipo}`} style={{ width: '100%' }} />;
}

// Uso:
<DiskImage pid="P001" did={3} tipo="analise" />
<DiskImage pid="P001" did={3} tipo="evolucao" />
```

### React — gráfico de evolução com Chart.js / Recharts

```jsx
async function loadDiscoData(pid, did) {
  const res = await fetch(`http://localhost:5055/paciente/${pid}/disco/${did}/dados`);
  const data = await res.json();
  
  // Formatar para o gráfico
  return data.serie_temporal.map(ponto => ({
    tempo: ponto.timestamp,
    halo: ponto.halo_w_mm,
    disco: ponto.black_r_mm,
  }));
}
```

### Axios

```js
import axios from 'axios';

const api = axios.create({ baseURL: 'http://localhost:5055' });

// Todos os endpoints
api.get('/pacientes')
api.get('/paciente/P001/resumo')
api.get('/paciente/P001/imagem/barras', { responseType: 'blob' })
api.get('/paciente/P001/disco/1/dados')
```

---

## Mapa completo de endpoints

```
GET  /                                         → info geral
GET  /pacientes                                → lista de pacientes

GET  /paciente/{pid}/resumo                    → JSON antibiograma completo
GET  /paciente/{pid}/imagem/geral              → PNG placa anotada
GET  /paciente/{pid}/imagem/grid               → PNG grid dos 18 discos
GET  /paciente/{pid}/imagem/barras             → PNG barras comparativas
GET  /paciente/{pid}/imagem/evolucao_todos     → PNG evolução temporal geral

GET  /paciente/{pid}/disco/{did}/analise       → PNG 4-painéis do disco
GET  /paciente/{pid}/disco/{did}/evolucao      → PNG evolução temporal do disco
GET  /paciente/{pid}/disco/{did}/dados         → JSON série temporal (948 frames)
```

**Valores válidos:**
- `{pid}`: `P001`, `P002`, `P003`, `P004`, `P005`
- `{did}`: `1` a `18`

---

## Erros comuns

| Código | Motivo |
|---|---|
| `404` | `pid` ou `did` inválido |
| `503` | API ainda processando o cache inicial (aguardar ~30s) |
| `500` | Arquivo de configuração `discos_config.json` não encontrado |

---

*API gerada a partir de `GerarGrafico2D_v5_direcional.py` — calibração 400px = 140mm, 18 discos, 948 frames.*
