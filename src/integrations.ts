export interface ClickUpTaskPreview {
  title: string
  description: string
  destinationList: string
}

export interface ClickUpGateway {
  previewTask(title: string, description: string, destinationList?: string): ClickUpTaskPreview
  createTask(preview: ClickUpTaskPreview, confirmed: boolean): { id: string; simulated: boolean }
}

export class MockClickUpGateway implements ClickUpGateway {
  previewTask(title: string, description: string, destinationList?: string) {
    if (!destinationList) throw new Error('Choose a destination List before previewing the task.')
    return { title, description, destinationList }
  }

  createTask(_preview: ClickUpTaskPreview, confirmed: boolean) {
    if (!confirmed) throw new Error('Explicit confirmation is required before task creation.')
    return { id: `SIM-${Date.now()}`, simulated: true }
  }
}

export class ProductionClickUpGateway implements ClickUpGateway {
  previewTask(_title: string, _description: string, _destinationList?: string): ClickUpTaskPreview {
    void _title
    void _description
    void _destinationList
    throw new Error('Production ClickUp is not configured. Request denied.')
  }
  createTask(_preview: ClickUpTaskPreview, _confirmed: boolean): { id: string; simulated: boolean } {
    void _preview
    void _confirmed
    throw new Error('Production ClickUp is not configured. Request denied.')
  }
}

export class ProductionEntraAdapter {
  authenticate() {
    throw new Error('Production Entra ID is not configured. Sign-in denied.')
  }
}
