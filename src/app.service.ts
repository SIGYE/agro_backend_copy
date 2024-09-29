import { Injectable } from '@nestjs/common'

@Injectable()
export class AppService {
  getHello(): string {
    return `
  <div style="height:100vh; text-align:center; background-color:#f5f5f5; display:flex; flex-direction:column; flex-wrap:wrap; gap:10px; justify-content:center; align-items:center">
    <svg width="100" height="100" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="green">
      <!-- Simple agriculture logo with a plant -->
      <g>
        <circle cx="12" cy="12" r="10" stroke="green" stroke-width="2" fill="none"/>
        <path d="M12 14c-2 0-4-1.5-4-4 0-1.5 1-3 2-3s2 1.5 2 3c0 1 0 2 1 2s1-1 1-2c0-1.5 1-3 2-3s2 1.5 2 3c0 2.5-2 4-4 4" fill="green"/>
        <line x1="12" y1="14" x2="12" y2="20" stroke="green" stroke-width="2"/>
        <line x1="10" y1="18" x2="14" y2="18" stroke="green" stroke-width="2"/>
      </g>
    </svg>
    <h1 style="text-align:center; color : green">AGRICULTURE APP BACKEND APIs</h1>
  </div>
`;

  }
}
