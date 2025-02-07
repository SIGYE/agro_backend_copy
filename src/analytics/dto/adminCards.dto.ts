export class AdminCardsDto {
    totalFarmers: number
    totalCooperatives: number
    totalGroups: number
    totalCrops: number
    totalAnimals: number

    constructor(totalFarmers, totalCooperatives, totalGroups, totalCrops, totalAnimals) {
        this.totalFarmers = totalFarmers
        this.totalCooperatives = totalCooperatives
        this.totalGroups = totalGroups
        this.totalCrops = totalCrops
        this.totalAnimals = totalAnimals
    }
}