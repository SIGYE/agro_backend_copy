interface HarvestReportResponse {
    data: {
        cropId: number;
        cropName: string;
        totalProduce: number;
        averageProducePerCrop: number;
        numberOfSeasons: number;
        cropTypes: {
            cropTypeId: number;
            cropTypeName: string;
            totalProduce: number;
            averageProducePerType: number;
            percentageOfTotalProduce: number;
            numberOfSeasons: number;
        }[];
    }[];
    meta: {
        total: number;
        page: number;
        lastPage: number;
        limit: number;
        locationId: number | null;
    };
}