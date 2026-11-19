// (C) David Lawrence released under the GPL (see license.txt)
// Started:       21 Aug 2004
// Last modified: 21 Aug 2004

#include "game/storyteller/storyteller.h"
#include "graphics/2d/text2d.h"
#include "util/settings.h"
#include "util/string_util.h"
#include <iostream>

using namespace std;

static const float  IMAGE_V_RATIO  = 0.666f; // of screen height (ORTHO_H)
static const float  DIALOGUE_V_RATIO = 1.0f - IMAGE_V_RATIO;

extern Settings settings;

StoryTeller::StoryTeller():
GameComponent(),
image(0),
text_background(0)
{
	status = PLAYING;
}


StoryTeller::~StoryTeller()
{
	delete image;
	delete text_background;

	vector<Dialogue*>::iterator end = dialogue_list.end();
	for( dialogue = dialogue_list.begin() ; dialogue != end ; ++dialogue ) {
		delete *dialogue;
	}
}


void StoryTeller::_load(void)
{
	const Properties<Scalar>* prop = settings.get("story");

	// Default portraits (can be overridden in story files)
	portrait["Harlow"] = (string)prop->get("harlow_pic");
	portrait["Chief"]  = (string)prop->get("chief_pic");
	portrait["Mayor"]  = (string)prop->get("mayor_pic");
	portrait["Boffin"] = (string)prop->get("boffin_pic");

	msec_initial  = (int)prop->get("msec_initial"); 
	msec_per_word = (int)prop->get("msec_per_word");
	dialogue_v_ratio = (float)prop->get("dialogue_v_ratio");
	dir              = dircheck( prop->get("dir") );

	float w = Display::ORTHO_W;
	float h = Display::ORTHO_H * DIALOGUE_V_RATIO;
	text_background = new Quad(w,h);
	text_background->setColor(0.0f, 0.0f, 0.0f);
	text_background->position.y = -Display::ORTHO_H/2 + h/2; //bottom

	try {
		StoryFileReader story(dir + filename, this );
	} catch( string &e ) {
		cout << e << endl;
	}

	time_displayed = 0;
	dialogue = dialogue_list.begin();
	if( dialogue_list.empty() )
		GameComponent::status = NEXT; // no point displaying

	if( image ) {
		image->setWidth( Display::ORTHO_W );
		image->position.y = Display::ORTHO_H * (IMAGE_V_RATIO - 0.5f);
	}
}


void StoryTeller::_play(Uint32 msecs, Input* input, float alpha)
{
	Display& d = Display::Instance();

	if( image ) {
		d.draw_context_2d( image, alpha );
	}
	glDisable(GL_TEXTURE_2D);
	d.draw_context_2d( text_background, alpha );
	(*dialogue)->speak(msecs);

	if( (*dialogue)->done() ) {
		// every game component might need to be displayed after it has
		// finished - in this case continue to draw the last dialogue
		vector<Dialogue*>::iterator next = dialogue;
		if( ++next != dialogue_list.end() ) {
			dialogue = next;
		} else {
			GameComponent::status = NEXT;
		}
		time_displayed = 0;
	}
}


void StoryTeller::setImage(string& filename)
{
	delete image; // get rid of old one if already defined.
	image = new Image(dir + filename);
}


void StoryTeller::setPortrait(string& character, string& texture)
{
	portrait[character] = texture;
}



void StoryTeller::addDialogue(strings_t& wordlist)
{
	string& first = wordlist[0];
	float width  = Display::ORTHO_W;
	float height = Display::ORTHO_H * DIALOGUE_V_RATIO;
	Dialogue* d = 0;

	size_t len = first.length();
	if( len > 1 && first[len-1] == ':' ) {
		string speaker = first;
		speaker.resize( len-1 );

		// Load an image, depending on who the speaker is. A narrator
		// by default has no portrait, so it is ok to pass NULL
		Image* portrait_image = 0;
		portrait_table_t::iterator pt = portrait.find(speaker);
		if( pt != portrait.end() ) {
			portrait_image = new Image(dir + pt->second);
		}
		d = new Dialogue(width,height, portrait_image,
			wordlist, msec_initial, msec_per_word);
		d->position.y = -Display::ORTHO_H/2 + height/2; //bottom
		dialogue_list.push_back( d );
	}
}



StoryFileReader::StoryFileReader(const std::string f, StoryTeller* s):
TextFileReader(f), st(s)
{
	process();
}

void StoryFileReader::handle_line(string& line)
{
	strings_t wordlist = split(line);

	if( wordlist.size() >= 2 ) {
		if( wordlist[0] == "picture" ) {
			st->setImage( wordlist[1] );
		} else if( wordlist[0] == "portrait" ) {
			if( wordlist.size() >= 3 )
				st->setPortrait( wordlist[1], wordlist[2] );
		} else {
			st->addDialogue( wordlist );
		}
	}
}

