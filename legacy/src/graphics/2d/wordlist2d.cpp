// (C) David Lawrence released under the GPL (see license.txt)
// Started:       Thu Feb 10 22:30:51 2005
// Last modified: Thu Feb 10 22:30:51 2005

#include "graphics/2d/text2d.h"
#include "graphics/2d/wordlist2d.h"
#include <iostream>

using namespace std;

// FIXME: proper settings

static const float FONT = 0.2f;
static const float LINE_SPACING = 0.005f;

WordList2D::WordList2D(GLfloat w, GLfloat h, strings_t& words):
    Drawable2D(w,h), wordCount(0)
{
    string space = " ";
    float space_length = text_width(space.c_str()) * FONT;
    float line_length = 0.0f;
    string line;
    line.erase();

    strings_t::iterator word = words.begin();
    ++word; // skip character name, eg "Harlow:"

    for( wordCount = 0 ; word != words.end() ; ++wordCount ) {
	float word_length = text_width(word->c_str()) * FONT;
	if( line_length + word_length > getWidth() ) {
	    text.push_back( new Text2D(line, FONT) );
	    line_length = 0.0f;
	    line.erase();
	}
	line += space + *word;
	line_length += space_length + word_length;

	++word; // next
    }
    if( line_length ) { // any remaining on a new line
	text.push_back( new Text2D(line, FONT) );
    }

    // align the text
    vector2 topleft(-getWidth()/2.0f, getHeight()/2.0f);

    for( textlist_t::iterator tp = text.begin() ; tp != text.end() ; ++tp ) {
	(*tp)->position = topleft;
	(*tp)->position.x += (*tp)->getWidth()/2;
	topleft.y -= (*tp)->getHeight() + LINE_SPACING;
    }
}


WordList2D::~WordList2D()
{
    for( textlist_t::iterator tp = text.begin() ; tp != text.end() ; ++tp ) {
	delete (*tp);
    }
}


void WordList2D::representation(GLfloat alpha)
{
    for( textlist_t::iterator tp = text.begin() ; tp != text.end() ; ++tp ) {
	(*tp)->draw(alpha);
    }
}


/*
float WordList2D::getHeight(void)
{

    if( height == 0 ) {
	if( portrait ) {
	    height += portrait->getHeight();
	}
	// for each dialogue... add text_height
   }
    return height;

}
*/

