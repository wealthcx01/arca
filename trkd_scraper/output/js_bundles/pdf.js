//A Helper Method to Get the ric show the pdf option or not
var WHITE_CC = ["JPN"];


function isShowPDFOption(si){
    //Check in the blacklist
//    alert("ric"+si.ric+" cc"+si.cc+" tradable"+si.tradable);
    if(si.url != null){
        return true;
    }
    if (si.isBlacklist){
        //In Blacklist, no reason to display pdf button
        //alert("Oh..Blacklist, hide pdf button");
        return false;
    }else{
        //Then check is tradable
        if (si.tradable != "none" && si.tradable){
            //alert("Oh..is tradable, show pdf button");
            return true;
        }else{
            //check is in white country
            if (jQuery.inArray(si.cc, WHITE_CC) >= 0){
                //alert("Oh..in white cc, show pdf button");
                return true;
            }else{
                //alert("Not in cc, no trabable");
                return false;
            }
        }
    }    
}