// (C) David Lawrence released under the GPL (see license.txt)
// Started:       Wed Feb 22 23:05:12 2006

#include "lsysrenderer.h"
#include <iostream>

using namespace std;


LSysRenderer::LSysRenderer(const LSystem& ls):
	lsys(ls)
{

}

LSysRenderer::~LSysRenderer()
{

}


void LSysRenderer::representation(drawdetails_t& drawdetails)
{
	renderLSys(lsys.getResult().c_str());
}

void LSysRenderer::renderLSys(const char* str)
{
	float origin[3] = { 0.0f, 0.0f, 0.0f };
	int depth = 0;

	size_t len = (str != NULL) ? strlen(str) : 0;

	  /* For each character in the rule ... */
	for(size_t i = 0; i < len; i++) {
		char c = str[i];
		//cout << "c = " << c << endl;

		float dist = distance;

		switch (c) {
			case '|': // Draw forward by length computed by recursion depth
				dist /= (float)pow(2.0, depth);
				//cout << "depth = " << depth << " dist is now " << dist << endl;
			case 'F': // Draw forward
				// fallthrough
				glBegin(GL_LINES);
				glVertex3fv(origin);
				glVertex3f(0.0f, dist, 0.0f);
				glEnd();
				// fallthrough to also perform translation
			case 'G': // Go forward (without drawing)
				glTranslatef(0.0f, dist, 0.0f);
				break;
			case '+': // turn to right
				glRotatef(angle, 0.0f, 0.0f, 1.0f);
				break;
			case '-': // turn to left
				glRotatef(-angle, 0.0f, 0.0f, 1.0f);
				break;
			case '[': // push state
				glPushMatrix();
				++depth;
				break;
			case ']': // pop state
				glPopMatrix();
				--depth;
				break;
			default:
				cout << __FILE__ << ": (warning) unknown lsys character '" << c << "'\n";
		}
	}
}

Drawable* LSysRenderer::clone(void) const
{
    return new LSysRenderer(*this);
}