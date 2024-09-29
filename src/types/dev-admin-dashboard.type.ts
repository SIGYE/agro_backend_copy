export type DevAdminSmsCardsReport = {
    totalOrganisationsUsingBulkSms: number;
    totalSmsBought: number;
    totalSmsSent: number;
    totalMoneySpent: number;
    messagePerOrganisation: {
      organisationName: string;
      messagesSent: number;
    }[];
  };


  export type DevAdminGraphResponse = {
    month : string ,
    count : number
  }

  export type DevAdminTeamStats = {
    teamName : string ,
    teamMembers : number
  }

  export type DevAdminMessageTableResponse = {
    organisationId : string
    organisationName : string
    smsBought : number
    smsUsed : number
    smsRemaining : number 
    totalMoneySpent : number
  }
   
  export type DevAdminOrganisationCardResponse = {
    organisationId : string
    totalSurveys : number;
    totalSurveyors : number;
    totalOrganisationAdmins : number;
    totalTeams : number;
  }

  export type DevAdminCardTeamStats = {
    totalOrganisations: number;
    totalSurveys: number;
    totalSurveyors: number;
    totalSuperAdmins: number;
    // If you want to include team members
    teamStats: {
        teamName: string;
        teamMembers: number;
    }[];
};


  