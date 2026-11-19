// (C) David Lawrence released under the GPL (see license.txt)
// Started:       Sat Jul  2 22:41:50 2005
// Last modified: Sat Jul  2 22:41:50 2005

#include "missionbuilder.h"
#include "game/mission/outcomes/outcomes.h"
#include "util/settings.h"
#include <string>

using namespace std;

extern Settings settings;

MissionBuilder::MissionBuilder(Mission* m, const string& name):
    mission(m)
{
    const string DIR = dircheck( settings.get("game", "mission.dir") );

    XMLDoc doc(DIR + name);
    xmlNodeMap mission_node;
    xml_map(doc.root->children, mission_node);
    buildStartConditions( mission_node["startconditions"] );
    buildConstraints( mission_node["constraints"] );
    buildOutcomes( mission_node["outcomes"] );
}


void MissionBuilder::buildStartConditions(xmlNodePtr node)
{
    xmlNodeMap startconditionsXML;
    xml_map( node->children, startconditionsXML);
    xmlStringValue str_height( startconditionsXML["height"] );
    float start_height = stringToFloat( str_height );

    xmlStringMap model;
    xml_map( startconditionsXML["model"]->children, model );
    
    xmlNodePtr claw = startconditionsXML["claw"];
    if (claw) {
	buildClaw( claw );
    }

    mission->player = new Player(model["name"], model["skin"],
				 start_height, Player::FOLLOW);

    xmlNodePtr countdown = startconditionsXML["countdown"];
    if( countdown ) {
	xmlStringMap countdownXML;
	xml_map( countdown->children, countdownXML );
	int secs = stringToInt( countdownXML["seconds"] );
	string label = countdownXML["label"];
	mission->countdowntimer = new CountDownTimer(secs, label);
    }
}


void MissionBuilder::buildClaw(xmlNodePtr node)
{
    xmlStringMap clawXML;
    xml_map( node->children, clawXML );
    float min_visible_height = stringToFloat( clawXML["targetheight"] );
    GiantClaw* claw = new GiantClaw( min_visible_height );

    string inc = clawXML["inc"];
    if( !inc.empty() ) {
	claw->setInc( stringToFloat(inc)/100.0f ); // percent
    }
    string dec = clawXML["dec"];
    if( !dec.empty() ) {
	claw->setDec( stringToFloat(dec)/100.0f ); // percent
    }
    string hfactor = clawXML["heightfactor"];
    if( !hfactor.empty() ) {
	claw->setHeightFactor( stringToFloat(hfactor) );
    }
    mission->claw = claw;
}


void MissionBuilder::buildConstraints(xmlNodePtr node)
{
	if (!node) return;

    Constraints* constraints = new Constraints();

    xmlStringMap constraintsXML;
    xml_map( node->children, constraintsXML );
    string max_height = constraintsXML["max_height"];
    if( !max_height.empty() ) {
	constraints->max_height = stringToFloat(max_height);
    }
    string min_height = constraintsXML["min_height"];
    if( !min_height.empty() ) {
	constraints->min_height = stringToFloat(min_height);
    }
    string max_speed = constraintsXML["max_speed"];
    if( !max_speed.empty() ) {
	constraints->max_speed = stringToFloat(max_speed);
    }
    string min_speed = constraintsXML["min_speed"];
    if( !min_speed.empty() ) {
	constraints->min_speed = stringToFloat(min_speed);
    }
    mission->constraints = constraints;
}

void MissionBuilder::buildOutcomes(xmlNodePtr node)
{
	if (node)
		mission->outcomes = new Outcomes(node);
}
