from flask import Flask

app = Flask(__name__)

@app.route('/')
def hello():
    return {'message': 'Hello from minimal Flask!', 'status': 'working'}

@app.route('/test')
def test():
    return {'message': 'Test endpoint working!', 'status': 'success'}

if __name__ == '__main__':
    app.run(debug=True) 