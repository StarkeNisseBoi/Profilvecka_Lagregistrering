import http from 'http';
import { cleanupHTMLOutput, getRequestBody } from '../utilities.js';
import { dbo } from '../index.js';
import { ObjectId } from 'mongodb';
import fs from 'fs/promises';

/**
 * 
 * @param {string[]} pathSegments 
 * @param {URL}
 * @param {http.IncomingMessage} request 
 * @param {http.ServerResponse} response 
 */
export async function handleProfilesRoute(pathSegments, url, request, response){
    let nextSegment = pathSegments.shift();
    if (!nextSegment){
        if (request.method === 'POST') {
            let body = await getRequestBody(request);
    
            let params = new URLSearchParams(body);
    
        if (!params.get('teamName') || !params.get('city')
            || params.get('players') < 5 ) {
    
            response.writeHead(400, { 'Content-Type': 'text/plain' });
            response.write('400 Bad Request');
            response.end();
            return;
        }
    
            let result = await dbo.collection('Teams').insertOne({
                'TeamName': params.get('teamName'),
                'City': params.get('city'),
                'Players': params.get('players')
            });
    
            response.writeHead(303, { 'Location': '/Teams/' + result.insertedId });
            response.end();
            return;
        }

        if (request.method === 'GET'){
            let filter = {};

            if (url.searchParams.has('age')){
                filter.age = url.searchParams.get('age');
            }
            if(url.searchParams.has('name')){
                filter.name = url.searchParams.get('name');
            }

            let documents = await dbo.collection('Teams').find(filter).toArray();

            let profilesString = '';

            for( let i = 0; i < documents.length; i++){
                profilesString += 
                '<li><a href="/Teams/' 
                + cleanupHTMLOutput(documents[i]._id.toString()) 
                + '">' 
                + cleanupHTMLOutput(documents[i].name) 
                + ' (' 
                + cleanupHTMLOutput(documents[i].age) 
                + ')</a></li>';
            }
            let template = (await fs.readFile('templates/profiles-list.volvo')).toString();

            template = template.replaceAll('%{profilesList}%', profilesString);

            response.writeHead(200, {'Content-Type': 'text/html;charset=UTF-8'});
            response.write(template);
            response.end();
            return;
        }

        response.writeHead(405, { 'Content-Type': 'text/plain' });
        response.write('405 Method Not Allowed');
        response.end();
        return;
    }

    if (request.method !== 'GET') {
        response.writeHead(405, { 'Content-Type': 'text/plain' });
        response.write('405 Method Not Allowed');
        response.end();
        return;
    }

    let profileDocument;
    try{
        profileDocument = await dbo.collection('Teams').findOne({
            "_id": new ObjectId(nextSegment)
        });
    }catch(e){
        response.writeHead(404, { 'Content-Type': 'text/plain'});
        response.write ('404 Not Found');
        response.end();
        return;
    }


    if(!profileDocument){
        response.writeHead(404, { 'Content-Type': 'text/plain'});
        response.write ('404 Not Found');
        response.end();
        return;
    }

    let template = (await fs.readFile('templates/profile.volvo')).toString();

    template = template.replaceAll('%{teamName}%', cleanupHTMLOutput(profileDocument.TeamName));
    template = template.replaceAll('%{city}%', cleanupHTMLOutput(profileDocument.City));
    template = template.replaceAll('%{players}%', cleanupHTMLOutput(profileDocument.Players));

    response.writeHead(200, {'Content-Type': 'text/html;charset=UTF-8'});
    response.write(template);
    response.end();
    return;
}
    