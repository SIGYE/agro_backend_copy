export type SuperAdminStatsResponse = {
    totalSurveys: number;
    notStartedSurveys: number;
    startedSurveys: number;
    terminatedSurveys: number;
    totalUsers: number;
    activatedUsers: number;
    deactivatedUsers: number;
    totalQuestionnaires: number;
    totalOpenQuestionnaires: number;
    totalSelfConductedQuestionnaires: number;
  };


  export type SuperAdminGraphResponse = {
    month : string ,
    count : number
  }


  export type SuperAdminTeamStats = {
    teamName : string ,
    teamMembers : number
  }
  