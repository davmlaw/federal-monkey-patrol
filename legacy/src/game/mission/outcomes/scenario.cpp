// (C) David Lawrence released under the GPL (see license.txt)
// Started:       Tue Jul  5 00:15:39 2005
// Last modified: Tue Jul  5 00:15:39 2005

#include "scenario.h"
#include "game/mission/gamestatistics.h"

using namespace std;
using namespace condition_space;

extern GameStatistics gamestats;


Scenario::Scenario(xmlNodePtr node):
    test(0),
    result(0)
{
    xmlNodeMap scenarioXML;
    xml_map( node->children, scenarioXML );
    xmlNodePtr conditionNodePtr = scenarioXML["condition"];
    xmlNodePtr resultNodePtr    = scenarioXML["result"];
    
    if( !(conditionNodePtr && resultNodePtr) ) {
	throw "<scenario> requires <condition> and <result>\n";
    }

    test   = ConditionBuilder(conditionNodePtr->children);
    result = buildResult(resultNodePtr);
}


Scenario::~Scenario()
{
    delete test;
    delete result;
}


void Scenario::run(Mission* mission)
{
    if( test->isTrue() ) {
	result->execute(mission);
    }
}


Result* Scenario::buildResult(xmlNodePtr node)
{
    xmlStringMap resultXML;
    xml_map( node->children, resultXML );

    strings_t args;
    args.push_back( resultXML["value"] );
    args.push_back( resultXML["message"] );
    return new ChangeStatusResult(args);
}
