# AI Canvas Architect

Generate visual knowledge maps from your notes using AI-powered spatial reasoning.

## Features

- **Auto-Graphing**: Automatically create canvas visualizations from topics or notes
- **Spatial Layout**: Uses MDS (Multidimensional Scaling) to position related notes close together
- **Cluster Detection**: DBSCAN algorithm groups related notes into visual clusters
- **AI Cluster Labels**: Generate descriptive labels for clusters using OpenAI or Anthropic
- **Similarity Edges**: Visualize connections between similar notes

## Requirements

- [Obsidian](https://obsidian.md/) v1.0.0+
- [Vault Embeddings](https://github.com/eohjun/obsidian-vault-embeddings) plugin (required for note embeddings)
- OpenAI or Anthropic API key (optional, for cluster labeling)

## Installation

### BRAT (Recommended for Beta)
1. Install [BRAT](https://github.com/TfTHacker/obsidian42-brat) plugin
2. Add beta plugin: `eohjun/obsidian-ai-canvas-architect`

### Manual
1. Download latest release from [Releases](https://github.com/eohjun/obsidian-ai-canvas-architect/releases)
2. Extract to `.obsidian/plugins/ai-canvas-architect/`
3. Reload Obsidian and enable the plugin

## Usage

### Generate Canvas from Topic
1. Open command palette (Ctrl/Cmd + P)
2. Search for "Generate Canvas from Topic"
3. Enter a topic to explore
4. Configure options and click "Generate Canvas"

### Generate Canvas from Current Note
1. Open a markdown note
2. Open command palette (Ctrl/Cmd + P)
3. Search for "Generate Canvas from Current Note"
4. Configure options and click "Generate Canvas"

### Quick Access
- Click the network icon in the ribbon for quick canvas generation

## Settings

### AI Provider
- **Provider**: Choose between OpenAI or Anthropic
- **API Key**: Your API key for AI features
- **Model**: Select the AI model for generating labels

### Canvas
- **Maximum nodes**: Number of notes to include (10-100)
- **Edge threshold**: Minimum similarity for connections (0.5-1.0)
- **Node size**: Width and height of note cards

### Clustering
- **Cluster radius**: Maximum distance between notes in a cluster
- **Minimum cluster size**: Minimum notes to form a group

### Embeddings
- **Embeddings folder**: Path to Vault Embeddings data

## Technical Architecture

```
src/
├── core/
│   ├── domain/           # Pure business logic
│   │   ├── entities/     # CanvasNode, CanvasEdge, CanvasGraph
│   │   ├── value-objects/# Coordinate, Dimension, NodeColor
│   │   ├── interfaces/   # Repository & Provider interfaces
│   │   └── services/     # MDS, DBSCAN algorithms
│   ├── application/      # Use cases & services
│   │   ├── use-cases/    # GenerateAutoGraph, LabelClusters
│   │   └── services/     # CanvasBuilderService
│   └── adapters/         # External integrations
│       ├── obsidian/     # Canvas repository, Vault adapter
│       ├── embedding/    # Vault Embeddings integration
│       └── llm/          # OpenAI, Anthropic providers
├── settings/             # Settings tab
├── views/                # Modals (control, progress)
└── main.ts               # Plugin entry point
```

## Development

```bash
# Clone repository
git clone https://github.com/eohjun/obsidian-ai-canvas-architect
cd obsidian-ai-canvas-architect

# Install dependencies
npm install

# Development build (watch mode)
npm run dev

# Production build
npm run build

# Type check
npm run typecheck
```

## Acknowledgments

- [Obsidian](https://obsidian.md/) for the excellent knowledge management platform
- [Vault Embeddings](https://github.com/eohjun/obsidian-vault-embeddings) for note embedding infrastructure

## License

MIT
