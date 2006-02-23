// (C) David Lawrence released under the GPL (see license.txt)
// Started:       Tue Apr 19 22:15:48 2005
// Last modified: Tue Apr 19 22:15:48 2005

#include "graphics/2d/chyron.h"
#include "graphics/2d/image.h"
#include "graphics/2d/text2d.h"

using namespace std;

#define IMG_H 0.8f


Chyron::Chyron(const std::string& song,
	       const std::string& artist,
	       const std::string& album,
	       float w, float h):
    Drawable2D(w,h)
{
    container = new Container2D(w, h);

    Drawable2D* background = new Quad(w,h);
    background->setColor( 0.1f, 0.1f, 0.1f, 0.5f );

    Drawable2D* image = new Image("data/images/audacity_alpha.png");
    image->setHeight( h * IMG_H ); // to keep aspect ratio
    image->position.x = -w/2 + image->getWidth()/2; // align left
    image->position.y =  h/2 - image->getHeight()/2; // align top

    container->add(background);
    container->add(image);

    // Text
    string str;
    vector2 pos = image->position + image->getSize()/2;

    Drawable2D* text  = new Text2D("monkey radio", h*1.5f);
    text->position = pos;
    container->add(text);

    vector2 shiftdown(0.0f, -0.2f * h);
    pos += shiftdown;

    str = "title:";
    text = new Text2D(str + song, h);
    text->position = pos;
    container->add(text);
    pos += shiftdown;

    str = "artist:";
    text = new Text2D(str + artist, h);
    text->position = pos;
    container->add(text);
    pos += shiftdown;

    str = "album:";
    text = new Text2D(str + album, h);
    text->position = pos;
    container->add(text);

    // Disable depth test so we can just use painters algorithm

}


void Chyron::representation(float alpha)
{
    glPushAttrib(GL_ENABLE_BIT);
    glDisable(GL_DEPTH_TEST);
    container->draw(alpha);
    glPopAttrib();
}


Chyron::~Chyron()
{
    delete container;
}


